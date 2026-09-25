"""
Network API — Criminal network graph data
Returns suspects, connections, and gang analysis using NetworkX.
"""

from fastapi import APIRouter
import pandas as pd
import networkx as nx
import os

router = APIRouter()

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'datasets')


# Cache data and graph in memory
_SUSPECTS_DF = pd.read_csv(os.path.join(DATA_DIR, 'suspects.csv'))
_MULES_DF = pd.read_csv(os.path.join(DATA_DIR, 'mule_accounts.csv'))

def _init_network():
    suspects = _SUSPECTS_DF
    mules = _MULES_DF
    
    G = nx.Graph()
    
    # Add suspect nodes
    for _, s in suspects.iterrows():
        G.add_node(s["suspect_id"], 
                   label=s["name"],
                   type="suspect",
                   role=s["role"],
                   city=s["city"],
                   gang=s["gang_id"],
                   risk=s["risk_score"])
    
    # Add mule account nodes (only first 500 to keep graph manageable)
    for _, m in mules.head(500).iterrows():
        G.add_node(m["account_id"],
                   label=f"{m['bank']} - {m['holder_name'][:15]}",
                   type="mule_account",
                   bank=m["bank"],
                   city=m["city"],
                   layer=m["layer_number"])
        
        # Edge: suspect controls mule account
        if m["controlled_by"] in G:
            G.add_edge(m["controlled_by"], m["account_id"], relation="controls")
    
    # Connect suspects in same gang
    for gang_id in suspects["gang_id"].unique():
        gang_members = suspects[suspects["gang_id"] == gang_id]["suspect_id"].tolist()
        mastermind = suspects[(suspects["gang_id"] == gang_id) & (suspects["role"] == "mastermind")]
        
        if len(mastermind) > 0:
            master_id = mastermind.iloc[0]["suspect_id"]
            for member_id in gang_members:
                if member_id != master_id:
                    G.add_edge(master_id, member_id, relation="commands")
    
    return G

_CACHED_GRAPH = _init_network()

def build_network():
    """Return the cached network graph, suspects, and mule accounts."""
    return _CACHED_GRAPH.copy(), _SUSPECTS_DF, _MULES_DF


@router.get("/network")
def get_network(gang_id: str = None, limit: int = 100):
    """Get criminal network graph data for visualization."""
    G, suspects, mules = build_network()
    
    # Filter by gang if specified
    if gang_id:
        gang_suspects = suspects[suspects["gang_id"] == gang_id]["suspect_id"].tolist()
        gang_mules = mules[mules["controlled_by"].isin(gang_suspects)]["account_id"].tolist()[:50]
        node_ids = set(gang_suspects + gang_mules)
        G = G.subgraph(node_ids)
    else:
        # If no specific gang, extract top 3 gangs to form a connected web instead of random scattered nodes
        top_gangs = suspects["gang_id"].value_counts().head(3).index.tolist()
        top_suspects = suspects[suspects["gang_id"].isin(top_gangs)]["suspect_id"].tolist()
        top_mules = mules[mules["controlled_by"].isin(top_suspects)]["account_id"].tolist()
        node_ids = set(top_suspects + top_mules)
        G = G.subgraph(node_ids)
    
    # Compute PageRank (who's the kingpin?)
    try:
        pagerank = nx.pagerank(G, max_iter=100)
    except Exception:
        pagerank = {n: 0.5 for n in G.nodes()}
    
    # Build nodes for vis.js
    nodes = []
    # If the subgraph is still too large, we limit it gracefully, but it's now mostly connected
    for node_id in list(G.nodes())[:max(limit, len(G.nodes()))]:
        data = G.nodes[node_id]
        pr = pagerank.get(node_id, 0)
        
        node_type = data.get("type", "unknown")
        
        # Color and size by type
        if node_type == "suspect":
            role = data.get("role", "unknown")
            color = {"mastermind": "#ff0040", "caller": "#ff6b00", 
                     "mule_recruiter": "#ffaa00", "cash_puller": "#00b4d8"}.get(role, "#888")
            size = 15 + (pr * 200)  # Bigger = more important
        else:
            color = "#4cc9f0"
            size = 8
        
        nodes.append({
            "id": node_id,
            "label": data.get("label", node_id),
            "type": node_type,
            "role": data.get("role", "mule_account"),
            "city": data.get("city", ""),
            "gang": data.get("gang", ""),
            "pagerank": round(pr, 4),
            "risk": data.get("risk", 0),
            "color": color,
            "size": round(size, 1),
        })
    
    # Build edges
    edges = []
    for u, v, data in G.edges(data=True):
        if u in [n["id"] for n in nodes] and v in [n["id"] for n in nodes]:
            edges.append({
                "from": u,
                "to": v,
                "relation": data.get("relation", "connected"),
            })
    
    return {
        "nodes": nodes,
        "edges": edges,
        "stats": {
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "top_kingpin": max(nodes, key=lambda x: x["pagerank"])["label"] if nodes else None,
        }
    }


@router.get("/network/gangs")
def get_gangs():
    """List all criminal gangs with their stats."""
    suspects = _SUSPECTS_DF
    
    gangs = []
    for gang_id in suspects["gang_id"].unique()[:50]:
        gang = suspects[suspects["gang_id"] == gang_id]
        masterminds = gang[gang["role"] == "mastermind"]
        
        gangs.append({
            "gang_id": gang_id,
            "member_count": len(gang),
            "mastermind": masterminds.iloc[0]["name"] if len(masterminds) > 0 else "Unknown",
            "primary_city": gang["city"].mode().iloc[0] if len(gang) > 0 else "Unknown",
            "avg_risk": round(gang["risk_score"].mean(), 2),
            "total_cases": int(gang["num_linked_cases"].sum()),
        })
    
    gangs.sort(key=lambda x: x["total_cases"], reverse=True)
    return {"gangs": gangs}
