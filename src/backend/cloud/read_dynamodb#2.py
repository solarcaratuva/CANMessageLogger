# file: read_dataretrievaltesting.py
print(">>> SCRIPT STARTED <<<")

import boto3
import json
from boto3.dynamodb.types import TypeDeserializer
from botocore.exceptions import ProfileNotFound, NoCredentialsError, ClientError
import decimal

# Convert DynamoDB Decimal types to float for JSON serialization
def decimal_to_float(obj):
    if isinstance(obj, decimal.Decimal):
        return float(obj)
    raise TypeError

REGION = "us-east-1"
TABLE_NAME = "DataRetrievalTesting"  # Your new table

deserializer = TypeDeserializer()

# Deserialize DynamoDB item to normal Python dict
def deserialize(item):
    return {k: deserializer.deserialize(v) for k, v in item.items()}

def pull_table_data(profile_name=None):
    print("STARTING PULL TABLE DATA")
    
    # Get profile name
    PROFILE = profile_name.strip() if profile_name else input("Enter AWS profile name: ").strip()
    if not PROFILE:
        print("Error: AWS profile cannot be empty")
        return None
    
    try:
        session = boto3.Session(profile_name=PROFILE, region_name=REGION)
        ddb = session.client("dynamodb")
    except ProfileNotFound:
        print(f"Error: AWS profile '{PROFILE}' not found")
        return None
    except NoCredentialsError:
        print("Error: No AWS credentials found")
        return None

    try:
        response = ddb.scan(TableName=TABLE_NAME)
        items = response.get("Items", [])
        print(f"Found {len(items)} items")
        parsed_items = [deserialize(item) for item in items]
        return parsed_items

    except ClientError as e:
        code = e.response['Error']['Code']
        if code == 'ResourceNotFoundException':
            print(f"Error: Table '{TABLE_NAME}' not found in region {REGION}")
        elif code == 'AccessDeniedException':
            print(f"Error: No permission to access table '{TABLE_NAME}'")
        else:
            print(f"AWS Error: {e.response['Error']['Message']}")
        return None
    except Exception as e:
        print(f"Unexpected error: {e}")
        return None

# --- Main Execution ---
data = pull_table_data()
if data:
    print("\n" + "="*50)
    print("PARSED DATA FROM DataRetrievalTesting TABLE:")
    print("="*50)
    print(json.dumps(data, indent=2, default=decimal_to_float))
else:
    print("Failed to retrieve data")
