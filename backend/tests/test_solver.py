import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1] / "app"))

from app.optimizer.solver import optimize_route

# Stops sit on a line (0 - 1 - 2 - 3) and each step costs 10 seconds.
LINE = [[abs(i - j) * 10 for j in range(4)] for i in range(4)]


def test_route_is_a_valid_optimal_round_trip():
    route, total = optimize_route(LINE)

    assert route[0] == 0 and route[-1] == 0          # starts and ends at the warehouse
    assert sorted(route[:-1]) == [0, 1, 2, 3]        # every stop visited exactly once
    assert total == 60                               # out to the far end and back


def test_single_delivery():
    route, total = optimize_route([[0, 5], [7, 0]])

    assert route == [0, 1, 0]
    assert total == 12