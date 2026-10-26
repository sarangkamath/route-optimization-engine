import requests
import locations

points = locations.locations

coordinates = ';'.join(
    [f'{point["lon"]},{point["lat"]}' for point in points]
)

url = f"https://router.project-osrm.org/table/v1/driving/{coordinates}?annotations=duration"

response = requests.get(url)
data = response.json()
print(data['durations'])