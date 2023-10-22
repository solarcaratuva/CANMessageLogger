import jimmyparser
import time

unparsedMsg = '00:39:39 DEBUG /workspaces/Rivanna2S/Common/include/ECUCANStructs.h:48: ECUPowerAuxCommands: hazards 0, brake_lights 0, headlights 0, left_turn_signal 0, right_turn_signal 0'
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