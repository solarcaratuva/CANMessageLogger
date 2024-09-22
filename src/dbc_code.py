import os
import can

import cantools


def get_messages_from_dbc(dbc_file: str):
    res = {}
    dbc: can.Database = cantools.database.load_file(dbc_file)
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


if __name__ == "__main__":
    dbc_file = os.path.join(os.path.dirname(__file__), "Rivanna3.dbc")
    messages = get_messages_from_dbc(dbc_file)
    print(messages)