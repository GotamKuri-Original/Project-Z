"""
🧠 XGBoost MODEL TRAINER — CrimeShield AI
==========================================
Trains a REAL XGBoost model on our synthetic data.

What it does:
1. Loads complaints + cash withdrawals data
2. Engineers features (encodes cities, fraud types, time features)
3. Trains XGBoost multi-class classifier to predict WITHDRAWAL CITY
4. Evaluates with train/test split, confusion matrix, classification report
5. Saves trained model + encoders to disk as .pkl files
6. Outputs feature importance (what the model actually learned)

Input:  Complaint features (fraud_type, amount, victim_city, hour, day, delay)
Output: Predicted withdrawal city (top 5 most likely cities with probabilities)
"""

import pandas as pd
import numpy as np
import pickle
import os
import json
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, f1_score
from xgboost import XGBClassifier

# Paths
DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'datasets')
MODEL_DIR = os.path.join(os.path.dirname(__file__))
os.makedirs(MODEL_DIR, exist_ok=True)


def load_and_prepare_data():
    """Load complaints and withdrawals, merge them to create training data."""
    print("Loading data...")
    complaints = pd.read_csv(os.path.join(DATA_DIR, 'complaints.csv'))
    withdrawals = pd.read_csv(os.path.join(DATA_DIR, 'cash_withdrawals.csv'))

    # Merge: each withdrawal is linked to a complaint
    # This gives us: complaint features → withdrawal city (our target)
    merged = withdrawals.merge(
        complaints,
        on='complaint_id',
        how='inner',
        suffixes=('_wd', '_comp')
    )

    print(f"  Merged dataset: {len(merged)} records")
    print(f"  Unique withdrawal cities: {merged['atm_city'].nunique()}")
    return merged


def engineer_features(df):
    """
    Create ML-ready features from raw data.
    
    Features we use:
    - fraud_type (encoded) — different fraud types have different cash-out patterns
    - amount — higher amounts may go to different withdrawal corridors
    - victim_city (encoded) — origin city determines likely cash-out corridors
    - hour_of_day — time of fraud affects withdrawal timing
    - day_of_week — weekday vs weekend patterns
    - is_weekend — binary flag
    - reporting_delay_mins — longer delays change criminal behavior
    - amount_bucket — discretized amount ranges
    - is_night — fraud during night hours
    """
    print("Engineering features...")

    # Encode categorical variables
    fraud_encoder = LabelEncoder()
    city_encoder = LabelEncoder()
    target_encoder = LabelEncoder()

    df['fraud_type_encoded'] = fraud_encoder.fit_transform(df['fraud_type_comp'])
    df['victim_city_encoded'] = city_encoder.fit_transform(df['victim_city_comp'])
    df['withdrawal_city_encoded'] = target_encoder.fit_transform(df['atm_city'])

    # Additional engineered features
    df['amount_log'] = np.log1p(df['amount_comp'])  # Log transform for skewed amounts
    df['amount_bucket'] = pd.cut(
        df['amount_comp'],
        bins=[-1, 10000, 50000, 200000, 500000, float('inf')],
        labels=[0, 1, 2, 3, 4]
    ).fillna(0).astype(int)
    df['is_night'] = ((df['hour_of_day'] >= 20) | (df['hour_of_day'] <= 5)).astype(int)
    df['delay_bucket'] = pd.cut(
        df['reporting_delay_mins'],
        bins=[-1, 15, 60, 180, 1440, float('inf')],
        labels=[0, 1, 2, 3, 4]
    ).fillna(0).astype(int)

    # Feature columns
    feature_cols = [
        'fraud_type_encoded',
        'victim_city_encoded',
        'amount_log',
        'amount_bucket',
        'hour_of_day',
        'day_of_week',
        'is_weekend',
        'reporting_delay_mins',
        'is_night',
        'delay_bucket',
    ]

    X = df[feature_cols].values
    y = df['withdrawal_city_encoded'].values

    print(f"  Features: {len(feature_cols)} columns")
    print(f"  Feature names: {feature_cols}")
    print(f"  Target classes: {len(target_encoder.classes_)} cities")

    return X, y, feature_cols, fraud_encoder, city_encoder, target_encoder


def train_model(X, y, feature_cols):
    """Train XGBoost with proper train/test split."""
    print("\nSplitting data (80% train / 20% test)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"  Train: {len(X_train)} | Test: {len(X_test)}")

    # Count classes for imbalance handling
    n_classes = len(np.unique(y))

    print(f"\nTraining XGBoost (n_classes={n_classes})...")
    model = XGBClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        objective='multi:softprob',
        num_class=n_classes,
        eval_metric='mlogloss',
        random_state=42,
        n_jobs=-1,
        verbosity=0,
    )

    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False,
    )

    # Evaluate
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred, average='weighted')

    print(f"\n{'='*50}")
    print(f"  MODEL RESULTS")
    print(f"{'='*50}")
    print(f"  Accuracy:  {accuracy:.4f} ({accuracy*100:.1f}%)")
    print(f"  F1-Score:  {f1:.4f} ({f1*100:.1f}%)")
    print(f"{'='*50}")

    # Feature Importance
    importance = model.feature_importances_
    feat_imp = sorted(zip(feature_cols, importance), key=lambda x: x[1], reverse=True)
    print("\n  Feature Importance (what the model learned):")
    for name, imp in feat_imp:
        bar = '#' * int(imp * 50)
        print(f"    {name:30s} {imp:.4f} {bar}")

    # Classification report (top 10 classes)
    print(f"\n  Classification Report (sample):")
    report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
    print(f"    Weighted Precision: {report['weighted avg']['precision']:.3f}")
    print(f"    Weighted Recall:    {report['weighted avg']['recall']:.3f}")
    print(f"    Weighted F1-Score:  {report['weighted avg']['f1-score']:.3f}")

    return model, accuracy, f1, feat_imp, report


def save_model(model, fraud_encoder, city_encoder, target_encoder, feature_cols, accuracy, f1, feat_imp):
    """Save everything needed for prediction."""
    print("\nSaving model and encoders...")

    # Save XGBoost model
    model_path = os.path.join(MODEL_DIR, 'xgboost_model.pkl')
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
    print(f"  Model saved: {model_path}")

    # Save encoders
    encoders_path = os.path.join(MODEL_DIR, 'encoders.pkl')
    with open(encoders_path, 'wb') as f:
        pickle.dump({
            'fraud_encoder': fraud_encoder,
            'city_encoder': city_encoder,
            'target_encoder': target_encoder,
            'feature_cols': feature_cols,
        }, f)
    print(f"  Encoders saved: {encoders_path}")

    # Save metadata (for the frontend/API)
    metadata = {
        'accuracy': round(accuracy, 4),
        'f1_score': round(f1, 4),
        'n_features': len(feature_cols),
        'feature_names': feature_cols,
        'feature_importance': {name: round(float(imp), 4) for name, imp in feat_imp},
        'target_cities': list(target_encoder.classes_),
        'fraud_types': list(fraud_encoder.classes_),
        'victim_cities': list(city_encoder.classes_),
    }
    metadata_path = os.path.join(MODEL_DIR, 'model_metadata.json')
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"  Metadata saved: {metadata_path}")


if __name__ == "__main__":
    print("=" * 60)
    print("  CrimeShield AI - XGBoost Model Training")
    print("=" * 60)
    print()

    # Step 1: Load data
    df = load_and_prepare_data()

    # Step 2: Engineer features
    X, y, feature_cols, fraud_enc, city_enc, target_enc = engineer_features(df)

    # Step 3: Train model
    model, accuracy, f1, feat_imp, report = train_model(X, y, feature_cols)

    # Step 4: Save everything
    save_model(model, fraud_enc, city_enc, target_enc, feature_cols, accuracy, f1, feat_imp)

    print()
    print("=" * 60)
    print("  TRAINING COMPLETE!")
    print(f"  Accuracy: {accuracy*100:.1f}% | F1: {f1*100:.1f}%")
    print("=" * 60)
