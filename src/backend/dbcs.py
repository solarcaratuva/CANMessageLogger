# The point of this file is to create DBCs once, instead of repeatedly being recreated whenever DbConnection is called
import cantools as ct
import os
import can

# DBC_FILES are the 'definitions'/'mappings' files, they are not parseable yet.
DBCs = None
# Function in our code depend on these definitions/configurations to get information on each type of can message.

def load_dbc_files() -> None:
    """ Loads all DBC files. Only needs to be called once """
    
    global DBCs
    dbc_files = os.listdir("./resources/CAN-messages/")
    DBCs = [ct.db.load_file(f"./resources/CAN-messages/{file}") for file in dbc_files if file.endswith(".dbc")]
    # DBCs takes the files from DBC_FILES and turns each file into a DBC Object that has functions to access can msg types


def get_messages_from_dbcs() -> dict:
    """ Returns a dictionary with message names as keys and a subdictionary of signal names and their types as values """

    res = dict()
    for dbc in DBCs:
        for message in dbc.messages:
            res[message.name] = dict()
            for signal in message.signals:
                if signal.length == 1:
                    res[message.name][signal.name] = "bool"
                elif signal.is_float:
                    res[message.name][signal.name] = "float"
                else:
                    res[message.name][signal.name] = "int"
    return res

