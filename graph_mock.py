import networkx as nx
import time
import random

def generate_cypher_mock():
    """Generates a dummy Neo4j Cypher query for the presentation."""
    cypher_query = """
// AEGIS-X: Continuous Identity Graph - Mule Account Detection
MATCH (u:User {id: $session_user_id})-[tx:TRANSFERRED_TO]->(m:Account)
WITH m, count(tx) AS in_degree_velocity, sum(tx.amount) AS total_volume
WHERE in_degree_velocity > 10 AND total_volume > 10000

// Check for rapid fan-out (Mule behavior indicator)
MATCH (m)-[out_tx:TRANSFERRED_TO]->(dest:Account)
WITH m, in_degree_velocity, count(out_tx) AS out_degree_velocity
WHERE (out_degree_velocity * 1.0 / in_degree_velocity) > 0.7

RETURN m.id AS MuleAccount, 
       in_degree_velocity, 
       out_degree_velocity, 
       "HIGH_RISK_MULE" AS ThreatLevel
    """
    return cypher_query

def build_identity_graph():
    """Builds a localized NetworkX graph to simulate transaction velocities."""
    G = nx.MultiDiGraph() # Using MultiDiGraph to allow multiple transactions between same nodes
    
    # Core User
    user_node = "Target_User"
    G.add_node(user_node, type="User")
    
    # Normal transaction nodes (low velocity, regular counterparties)
    normal_accounts = [f"Merchant_{i}" for i in range(1, 6)]
    for acc in normal_accounts:
        G.add_node(acc, type="Merchant")
        # Add 1-2 transactions per merchant
        for _ in range(random.randint(1, 2)):
            G.add_edge(user_node, acc, weight=random.uniform(10, 100), timestamp=time.time())
            
    # The 'Mule Account' (high fan-in from user, high fan-out to unknowns)
    mule_node = "Suspicious_Mule_001"
    G.add_node(mule_node, type="Flagged_Account")
    
    # High fan-in from Target_User to Mule (Burst behavior characteristic of APP Fraud coercion)
    for _ in range(15): # 15 rapid transfers in a single session
        G.add_edge(user_node, mule_node, weight=random.uniform(500, 2000), timestamp=time.time())
        
    # High fan-out from Mule to offshore/unknown accounts (Layering phase)
    offshore_accounts = [f"Offshore_{i}" for i in range(1, 8)]
    for off in offshore_accounts:
        G.add_node(off, type="Unknown")
        for _ in range(2): # 2 rapid transfers out per offshore account
            G.add_edge(mule_node, off, weight=random.uniform(800, 1500), timestamp=time.time())
            
    return G, user_node, mule_node

def calculate_velocity(G: nx.MultiDiGraph, node: str):
    """Calculates the in-degree and out-degree for a specific node."""
    in_degree = G.in_degree(node)
    out_degree = G.out_degree(node)
    
    # Calculate volume (sum of edge weights)
    in_volume = sum([data['weight'] for u, v, key, data in G.in_edges(node, data=True, keys=True)])
    out_volume = sum([data['weight'] for u, v, key, data in G.out_edges(node, data=True, keys=True)])
    
    return in_degree, out_degree, in_volume, out_volume

def run_simulation():
    print("="*65)
    print(" AEGIS-X IDENTITY GRAPH SIMULATION ".center(65))
    print("="*65)
    
    # 1. Show Cypher Query
    print("\n[+] Mock Neo4j Cypher Query (For Presentation Slides):")
    print("-" * 65)
    print(generate_cypher_mock().strip())
    print("-" * 65)
    
    # 2. Build NetworkX Graph
    print("\n[*] Initializing local NetworkX Identity Graph...")
    G, user_node, mule_node = build_identity_graph()
    print(f"[+] Graph built successfully: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges.")
    
    # 3. Analyze Normal User
    u_in, u_out, u_in_vol, u_out_vol = calculate_velocity(G, user_node)
    print(f"\n--- Node Velocity Analysis: {user_node} (Compromised User) ---")
    print(f"  Out-Degree (Tx Count): {u_out} transactions")
    print(f"  Out-Volume (Total $):  ${u_out_vol:,.2f}")
    
    # 4. Analyze Mule Account
    m_in, m_out, m_in_vol, m_out_vol = calculate_velocity(G, mule_node)
    print(f"\n--- Node Velocity Analysis: {mule_node} (Flagged Mule) ---")
    print(f"  In-Degree (Fan-In Velocity):   {m_in} transfers from Target")
    print(f"  In-Volume (Total Received):    ${m_in_vol:,.2f}")
    print(f"  Out-Degree (Fan-Out Velocity): {m_out} transfers to Unknowns")
    print(f"  Out-Volume (Total Sent):       ${m_out_vol:,.2f}")
    
    # 5. Verdict based on velocity
    print("\n[!] AEGIS-X VERDICT:")
    if m_in > 10 and (m_out / max(1, m_in)) > 0.5:
        print("    >> [HIGH ALERT] HIGH CONFIDENCE MONEY MULE DETECTED.")
        print("    >> BEHAVIOR: High-velocity fan-in followed by rapid fan-out layering.")
        print("    >> ACTION: FREEZE NODE 'Suspicious_Mule_001' AND INTERCEPT SESSION.")
    else:
        print("    >> [SAFE] NORMAL GRAPH BEHAVIOR.")
    print("="*65)

if __name__ == "__main__":
    run_simulation()
