import jimmyparser
import time

unparsedMsg = "00:39:43 DEBUG /workspaces/Rivanna2S/Common/src/MainCANInterface.cpp:63: Received CAN message with ID 0x406 Length 6 Data 0x422E00004663"
usetime = time.perf_counter() # should declare before loop to get timestamps
for i in range(100):
    testing, timer = jimmyparser.messageParser(unparsedMsg, usetime)
    if testing == None:
        print("Null", timer)
    else:
        for key, value in testing.items():
            print(f"{key}: {value}", timer)

"""
start_time = time.perf_counter()
print(start_time)

# Stop the performance counter
end_time = time.perf_counter()
print(end_time)

# Calculate the elapsed time
elapsed_time = end_time - start_time
print(elapsed_time)
"""