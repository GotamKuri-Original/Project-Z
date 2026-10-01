"""
Trace Service — Step 2 of the CrimeShield roadmap
=================================================
Deterministic, dataset-backed mule trace:
    complaint_id → linked cash_withdrawals (chronological)
                 → anchor = earliest withdrawal (mule_chain_length, last_mule_city)
                 → cash-out mule: layer-4 account in last_mule_city
                 → upstream mules: layers 1..3, same gang as the cash-out mule
                 → nodes + edges with derived timestamps and skimmed amounts
Same complaint_id + same dataset files → byte-identical trace.
No `random`, no wall-clock time, no Python hash() (salted per process).
The withdrawal ATM itself is never exposed — that is the model's prediction target.
"""
from __future__ import annotations
import hashlib
import os
from datetime import datetime, timedelta
from functools import lru_cache
from typing import Any, Dict, List, Optional, Set
import pandas as pd
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "datasets")
DATASET_FILES = ("complaints.csv", "cash_withdrawals.csv", "mule_accounts.csv", "suspects.csv")
TIMESTAMP_FORMAT = "%Y-%m-%d %H:%M:%S"
STATUS_SIMULATED = "SIMULATED_TRACE"
STATUS_NO_LINK = "NO_LINKED_TRANSACTIONS"
CASH_OUT_LAYER = 4
MIN_HOPS, MAX_HOPS = 1, 8
HOP_DELAY_MINUTES = (5, 40)
HOP_SKIM_RANGE = (0.05, 0.15)
UPI_TRANSFER_SHARE = 0.7
def _unit(*parts: Any) -> float:
    """Stable value in [0, 1) derived from SHA-256 — identical across runs and machines."""
    digest = hashlib.sha256("|".join(str(p) for p in parts).encode("utf-8")).digest()
    return int.from_bytes(digest[:8], "big") / float(1 << 64)
def _layer_for_position(position: int, hop_count: int) -> int:
    """Spread hops across layers 1..4: first hop = layer 1, last hop = cash-out layer 4."""
    if hop_count == 1:
        return CASH_OUT_LAYER
    # integer round-half-up of 1 + 3 * position / (hop_count - 1)
    return 1 + (6 * position + (hop_count - 1)) // (2 * (hop_count - 1))
def _dataset_fingerprint(paths: List[str]) -> str:
    sha = hashlib.sha256()
    for path in paths:
        with open(path, "rb") as fh:
            for chunk in iter(lambda: fh.read(1 << 20), b""):
                sha.update(chunk)
    return sha.hexdigest()[:12]
def _str_or_none(value: Any) -> Optional[str]:
    return None if pd.isna(value) else str(value)
class TraceService:
    def __init__(
        self,
        complaints_df: pd.DataFrame,
        withdrawals_df: pd.DataFrame,
        mules_df: pd.DataFrame,
        suspects_df: Optional[pd.DataFrame] = None,
        dataset_version: str = "unknown",
    ):
        self.dataset_version = dataset_version
        complaints = complaints_df.copy()
        complaints["complaint_id"] = complaints["complaint_id"].astype(str)
        self._complaints = complaints.set_index("complaint_id", drop=False)
        withdrawals = withdrawals_df.copy()
        withdrawals["complaint_id"] = withdrawals["complaint_id"].astype(str)
        withdrawals["withdrawal_id"] = withdrawals["withdrawal_id"].astype(str)
        withdrawals["ts"] = pd.to_datetime(withdrawals["timestamp"], format=TIMESTAMP_FORMAT, errors="coerce")
        withdrawals = withdrawals.dropna(subset=["ts"]).sort_values(
            ["complaint_id", "ts", "withdrawal_id"], kind="mergesort"
        )
        self._anchor_withdrawal = withdrawals.drop_duplicates("complaint_id", keep="first").set_index("complaint_id")
        self._linked_counts = withdrawals.groupby("complaint_id").size()
        mules = mules_df.copy()
        mules["account_id"] = mules["account_id"].astype(str)
        mules["controlled_by"] = mules["controlled_by"].astype(str)
        mules["layer_number"] = mules["layer_number"].astype(int)
        mules["is_active"] = mules["is_active"].astype(str).str.strip().str.lower().isin({"true", "1"})
        gang_by_suspect: Dict[str, str] = {}
        if suspects_df is not None and {"suspect_id", "gang_id"}.issubset(suspects_df.columns):
            gang_by_suspect = dict(zip(suspects_df["suspect_id"].astype(str), suspects_df["gang_id"].astype(str)))
        mules["gang_id"] = mules["controlled_by"].map(gang_by_suspect)
        self._mules = mules.sort_values("account_id", kind="mergesort").reset_index(drop=True)
        self._mules_by_layer = {int(layer): g for layer, g in self._mules.groupby("layer_number")}
        self._mules_by_city = {str(city): g for city, g in self._mules.groupby("city")}
    # ── Mule selection ──
    def _pick_mule(
        self,
        complaint_id: str,
        position: int,
        layer: int,
        used: Set[str],
        city: Optional[str] = None,
        gang_id: Optional[str] = None,
    ) -> Optional[pd.Series]:
        if city is not None:
            pool = self._mules_by_city.get(city)
        else:
            pool = self._mules_by_layer.get(layer)
        if pool is None or pool.empty:
            pool = self._mules
        pool = pool[~pool["account_id"].isin(used)]
        if pool.empty:
            return None
        scored = pool.assign(
            _gang_match=(pool["gang_id"] == gang_id).astype(int) if gang_id else 0,
            _layer_match=(pool["layer_number"] == layer).astype(int),
            _active=pool["is_active"].astype(int),
            _tiebreak=pool["account_id"].map(lambda acc: _unit("mule", complaint_id, position, acc)),
        )
        return scored.sort_values(
            ["_gang_match", "_layer_match", "_active", "_tiebreak", "account_id"],
            ascending=[False, False, False, True, True],
            kind="mergesort",
        ).iloc[0]
    # ── Public API ──
    def trace(self, complaint_id: str) -> Optional[Dict[str, Any]]:
        complaint_id = complaint_id.strip().upper()
        if complaint_id not in self._complaints.index:
            return None
        complaint = self._complaints.loc[complaint_id]
        complaint_ts = datetime.strptime(str(complaint["timestamp"]), TIMESTAMP_FORMAT)
        amount = int(complaint["amount"])
        fraud_type = str(complaint["fraud_type"])
        victim_node: Dict[str, Any] = {
            "type": "victim",
            "id": f"VICTIM-{complaint_id}",
            "hop": 0,
            "city": str(complaint["victim_city"]),
            "state": str(complaint["victim_state"]),
            "amount": amount,
            "timestamp": complaint_ts.strftime(TIMESTAMP_FORMAT),
            "resolved": True,
        }
        base: Dict[str, Any] = {
            "complaint_id": complaint_id,
            "dataset_version": self.dataset_version,
            "complaint": {
                "fraud_type": fraud_type,
                "amount": amount,
                "victim_city": str(complaint["victim_city"]),
                "victim_state": str(complaint["victim_state"]),
                "timestamp": complaint_ts.strftime(TIMESTAMP_FORMAT),
                "hour_of_day": int(complaint["hour_of_day"]),
                "day_of_week": int(complaint["day_of_week"]),
                "reporting_delay_mins": int(complaint["reporting_delay_mins"]),
            },
            "linked_transactions": int(self._linked_counts.get(complaint_id, 0)),
        }
        if complaint_id not in self._anchor_withdrawal.index:
            return {
                **base,
                "status": STATUS_NO_LINK,
                "hop_count": 0,
                "nodes": [victim_node],
                "edges": [],
                "last_known_city": None,
                "last_known_node": None,
                "trace_timestamp": None,
            }
        anchor = self._anchor_withdrawal.loc[complaint_id]
        hop_count = max(MIN_HOPS, min(MAX_HOPS, int(anchor["mule_chain_length"])))
        last_city = str(anchor["last_mule_city"])
        used: Set[str] = set()
        cash_out_mule = self._pick_mule(complaint_id, hop_count - 1, CASH_OUT_LAYER, used, city=last_city)
        gang_id = None
        if cash_out_mule is not None:
            used.add(cash_out_mule["account_id"])
            gang_id = _str_or_none(cash_out_mule["gang_id"])
        chain: List[Optional[pd.Series]] = []
        for position in range(hop_count - 1):
            mule = self._pick_mule(
                complaint_id, position, _layer_for_position(position, hop_count), used, gang_id=gang_id
            )
            if mule is not None:
                used.add(mule["account_id"])
            chain.append(mule)
        chain.append(cash_out_mule)
        nodes: List[Dict[str, Any]] = [victim_node]
        edges: List[Dict[str, Any]] = []
        current_ts = complaint_ts
        current_amount = amount
        previous_id = victim_node["id"]
        delay_lo, delay_hi = HOP_DELAY_MINUTES
        skim_lo, skim_hi = HOP_SKIM_RANGE
        for position, mule in enumerate(chain):
            hop = position + 1
            is_cash_out = hop == hop_count
            current_ts += timedelta(minutes=delay_lo + int(_unit("delay", complaint_id, hop) * (delay_hi - delay_lo + 1)))
            if position == 0:
                method = fraud_type.replace("_", " ")
            else:
                skim = skim_lo + _unit("skim", complaint_id, hop) * (skim_hi - skim_lo)
                current_amount = int(round(current_amount * (1 - skim), -2))
                method = "UPI Transfer" if _unit("method", complaint_id, hop) < UPI_TRANSFER_SHARE else "NEFT/IMPS"
            node = self._mule_node(
                mule, complaint_id, hop, _layer_for_position(position, hop_count),
                current_amount, current_ts, fallback_city=last_city if is_cash_out else None,
            )
            nodes.append(node)
            edges.append({
                "hop": hop,
                "from": previous_id,
                "to": node["id"],
                "amount": current_amount,
                "method": method,
                "timestamp": current_ts.strftime(TIMESTAMP_FORMAT),
            })
            previous_id = node["id"]
        return {
            **base,
            "status": STATUS_SIMULATED,
            "hop_count": hop_count,
            "nodes": nodes,
            "edges": edges,
            "last_known_city": last_city,
            "last_known_node": nodes[-1]["id"],
            "trace_timestamp": current_ts.strftime(TIMESTAMP_FORMAT),
        }
    @staticmethod
    def _mule_node(
        mule: Optional[pd.Series],
        complaint_id: str,
        hop: int,
        layer: int,
        amount: int,
        timestamp: datetime,
        fallback_city: Optional[str],
    ) -> Dict[str, Any]:
        if mule is None:
            return {
                "type": "mule", "id": f"UNRESOLVED-{complaint_id}-H{hop}", "hop": hop,
                "city": fallback_city, "state": None, "bank": None, "layer": layer,
                "controlled_by": None, "gang_id": None, "is_active": None,
                "amount": amount, "timestamp": timestamp.strftime(TIMESTAMP_FORMAT), "resolved": False,
            }
        return {
            "type": "mule",
            "id": str(mule["account_id"]),
            "hop": hop,
            "city": str(mule["city"]),
            "state": str(mule["state"]),
            "bank": str(mule["bank"]),
            "layer": int(mule["layer_number"]),
            "controlled_by": str(mule["controlled_by"]),
            "gang_id": _str_or_none(mule["gang_id"]),
            "is_active": bool(mule["is_active"]),
            "amount": amount,
            "timestamp": timestamp.strftime(TIMESTAMP_FORMAT),
            "resolved": True,
        }
def _node_label(node: Dict[str, Any]) -> str:
    city = node.get("city") or "Unknown"
    if node["type"] == "victim":
        return f"Victim ({city})"
    return f"Mule {node['hop']} ({city})"
def build_money_flow(trace: Dict[str, Any], withdrawal_city: str) -> List[Dict[str, Any]]:
    """Convert a trace into the `money_flow` shape the predict page already renders."""
    labels = {node["id"]: _node_label(node) for node in trace["nodes"]}
    flow = [
        {"from": labels[e["from"]], "to": labels[e["to"]], "amount": e["amount"], "method": e["method"]}
        for e in trace["edges"]
    ]
    if trace["edges"]:
        flow.append({
            "from": labels[trace["last_known_node"]],
            "to": f"ATM ({withdrawal_city})",
            "amount": trace["edges"][-1]["amount"],
            "method": "Cash Withdrawal",
        })
    return flow
@lru_cache(maxsize=1)
def get_trace_service() -> Optional[TraceService]:
    paths = {name: os.path.join(DATA_DIR, name) for name in DATASET_FILES}
    required = ("complaints.csv", "cash_withdrawals.csv", "mule_accounts.csv")
    missing = [name for name in required if not os.path.exists(paths[name])]
    if missing:
        print(f"[WARNING] Trace service disabled — missing {', '.join(missing)}")
        return None
    suspects_df = pd.read_csv(paths["suspects.csv"]) if os.path.exists(paths["suspects.csv"]) else None
    fingerprint_paths = [paths[n] for n in DATASET_FILES if os.path.exists(paths[n])]
    service = TraceService(
        complaints_df=pd.read_csv(paths["complaints.csv"]),
        withdrawals_df=pd.read_csv(
            paths["cash_withdrawals.csv"],
            usecols=["withdrawal_id", "complaint_id", "timestamp", "last_mule_city", "mule_chain_length"],
        ),
        mules_df=pd.read_csv(paths["mule_accounts.csv"]),
        suspects_df=suspects_df,
        dataset_version=_dataset_fingerprint(fingerprint_paths),
    )
    print(f"[TRACE] Trace service ready — dataset {service.dataset_version}")
    return service
