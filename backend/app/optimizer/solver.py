from fastapi import HTTPException, status

from ortools.constraint_solver import pywrapcp, routing_enums_pb2


def optimize_route(travel_time_matrix: list[list[int]]) -> tuple[list[int], int]:

    n = len(travel_time_matrix)

    # starting with one vehicle with source and destination being warehouse (node 0)
    manager = pywrapcp.RoutingIndexManager(n, 1, 0)
    routing = pywrapcp.RoutingModel(manager)

    def time_callback(from_index: int, to_index: int) -> int:
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)

        return travel_time_matrix[from_node][to_node]

    callback_index = routing.RegisterTransitCallback(
        time_callback
    )

    # Minimize total travel time.
    routing.SetArcCostEvaluatorOfAllVehicles(callback_index)

    search_parameters = (
        pywrapcp.DefaultRoutingSearchParameters()
    )

    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )

    search_parameters.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )

    search_parameters.time_limit.seconds = 3
    solution = routing.SolveWithParameters(search_parameters)

    if solution is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                            detail="OR-Tools could not find a feasible route",)

    route_indices = []
    total_seconds = 0

    index = routing.Start(0)

    while not routing.IsEnd(index):
        route_indices.append(manager.IndexToNode(index))
        next_index = solution.Value(routing.NextVar(index))

        total_seconds += routing.GetArcCostForVehicle(
            index,
            next_index,
            0,
        )
        index = next_index

    # Include the final warehouse node.
    route_indices.append(manager.IndexToNode(index))

    return route_indices, total_seconds
