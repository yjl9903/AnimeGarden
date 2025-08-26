# /// script
# dependencies = [
#   "requests",
# ]
# ///

import requests

url = "https://api.animes.garden/resources"
params = {
  'subject': [528438],
  'fansub': ["桜都字幕组"],
  'keyword': ["简体"],
  'after': 1751155200000
}

response = requests.get(url, params=params)
resources = response.json()

print(resources)
