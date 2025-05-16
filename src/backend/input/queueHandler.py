from backend.input.consumer import queue
from backend.input import alertChecker

def add_to_queue_with_instant_checks(cm_tup) -> None:
    #FIRST: run through the alerts checker
    alertChecker.checkAlertsAgainstCanMsg(cm_tup)
    
    queue.put(cm_tup)