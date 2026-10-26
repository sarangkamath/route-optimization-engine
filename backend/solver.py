from ortools.constraint_solver import pywrapcp, routing_enums_pb2
from osrm_client import data

durations = data['durations']

num_locations = len(durations)
warehouse = 0

# Validation of the matrix
assert all(len(row) == num_locations for row in durations), \
    "The duration matrix must be square."

# Convert seconds to integer seconds for OR-Tools.
time_matrix = [
    [round(seconds) for seconds in row]
    for row in durations
]

# Create the routing model.
manager = pywrapcp.RoutingIndexManager(
    num_locations,
    1,              # One vehicle
    warehouse       # Start and end at warehouse
)

routing = pywrapcp.RoutingModel(manager)

# Define travel time between any two locations.
def time_callback(from_index, to_index):
    from_node = manager.IndexToNode(from_index)
    to_node = manager.IndexToNode(to_index)
    return time_matrix[from_node][to_node]

callback_index = routing.RegisterTransitCallback(time_callback)

# Minimize total travel time.
routing.SetArcCostEvaluatorOfAllVehicles(callback_index)

# Configure the search.
search_parameters = pywrapcp.DefaultRoutingSearchParameters()

search_parameters.first_solution_strategy = (
    routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
)

search_parameters.local_search_metaheuristic = (
    routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
)

search_parameters.time_limit.seconds = 10

# Solve.
solution = routing.SolveWithParameters(search_parameters)

if solution:
    index = routing.Start(0)
    route = []
    total_seconds = 0

    while not routing.IsEnd(index):
        node = manager.IndexToNode(index)
        route.append(node)

        next_index = solution.Value(routing.NextVar(index))
        total_seconds += routing.GetArcCostForVehicle(
            index, next_index, 0
        )
        index = next_index

    route.append(manager.IndexToNode(index))

    print("Optimal/Best-found route:", " -> ".join(map(str, route)))
    print(f"Total travel time: {total_seconds} seconds")
    print(f"Total travel time: {total_seconds / 60:.2f} minutes")
else:
    print("No solution found.")
