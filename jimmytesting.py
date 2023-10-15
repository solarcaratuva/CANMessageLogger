import jimmyparser
import math


unparsedMsg = "00:39:43 DEBUG /workspaces/Rivanna2S/Common/src/MainCANInterface.cpp:63: Received CAN message with ID 0x406 Length 6 Data 0x422E00004663"
testing, timer = jimmyparser.messageParser(unparsedMsg)
if testing == None:
    print("Null", timer)
else:
    for key, value in testing.items():
        print(f"{key}: {value}", timer)

# Example float
my_float = 123.456

# Convert to an integer to remove decimal places to the left
my_integer = int(my_float)

print(my_integer)

