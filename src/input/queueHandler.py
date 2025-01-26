from input.consumer import queue

def add_to_queue_with_instant_checks(cm_tup) -> None:
    #FIRST: run through the alerts checker
    
    queue.put(cm_tup)