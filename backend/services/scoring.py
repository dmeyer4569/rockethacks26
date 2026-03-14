import numpy as np

# PROPOSAL_TEMPLATE = {
#     "changes": "",
#     "reasoning": "",
#     "ratings": [],
#     "cas": None,
#     "mean": None,
#     "std_dev": None,
#     "converged": None
# }

def calculate_cas(config, proposal: dict) -> dict:
    mean = np.mean(proposal["ratings"])
    std_dev = np.std(proposal["ratings"])
    cas = mean - std_dev*config["lambda"]
    
    proposal["cas"] = round(cas, 4)
    proposal["mean"] = round(mean, 4)
    proposal["std_dev"] = round(std_dev, 4)
    proposal["converged"] = cas >= config["convergence_threshold"] and std_dev <= config["variance-threshold"]
    
    return proposal
    
def select_policy(proposals: list):
    return max(proposals, key=lambda p: p["cas"])