print(">>> SCRIPT STARTED <<<")

import boto3
from boto3.dynamodb.types import TypeDeserializer

PROFILE = "muhammadhussain"
REGION = "us-east-1"
TABLE_NAME = "SolarTelemetry"

deserializer = TypeDeserializer()

def deserialize(item):
    return {k: deserializer.deserialize(v) for k, v in item.items()}

def main():
    session = boto3.Session(profile_name=PROFILE, region_name=REGION)
    ddb = session.client("dynamodb")

    response = ddb.scan(TableName=TABLE_NAME)
    items = response.get("Items", [])

    print(f"Found {len(items)} items")

    for raw_item in items:
        parsed = deserialize(raw_item)
        print(parsed)

if __name__ == "__main__":
    main()
