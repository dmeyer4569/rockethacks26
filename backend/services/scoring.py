import numpy as np

PENALTY = 0.5
CAS_THRESHOLD = 0.60
VARIANCE_THRESHOLD = 0.15

def calculate_cas(proposal: dict) -> dict:
    mean = np.mean(proposal["ratings"])
    std_dev = np.std(proposal["ratings"])
    cas = mean - std_dev*PENALTY
    
    proposal["cas"] = round(cas, 4)
    proposal["mean"] = round(mean, 4)
    proposal["std_dev"] = round(std_dev, 4)
    proposal["converged"] = cas >= CAS_THRESHOLD and std_dev <= VARIANCE_THRESHOLD
    
    return proposal
    
def select_policy(proposals: list):
    return max(proposals, key=lambda p: p["cas"])