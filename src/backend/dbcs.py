# The point of this file is to create DBCs once, instead of repeatedly being recreated whenever DbConnection is called
import cantools as ct
import os
import can

# DBC_FILES are the 'definitions'/'mappings' files, they are not parseable yet.
dbc_files = os.listdir("./resources/CAN-messages/")
DBCs = [ct.db.load_file(f"./resources/CAN-messages/{file}") for file in dbc_files if file.endswith(".dbc")]
# DBCs takes the files from DBC_FILES and turns each file into a DBC Object that has functions to access can msg types
# Function in our code depend on these definitions/configurations to get information on each type of can message.

def get_messages_from_dbc(dbc_file: str):
    res = {}
    dbc: can.Database = ct.database.load_file(dbc_file)
    for message in dbc.messages:
        res[message.name] = {}
        for signal in message.signals:
            if signal.length == 1:
                res[message.name][signal.name] = "bool"
            elif signal.is_float:
                res[message.name][signal.name] = "float"
            else:
                res[message.name][signal.name] = "int"
    return res

