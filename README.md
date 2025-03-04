# CAN Message Logger

TODO

## Installation

TODO

## Starting the program

Run the following commands in a command prompt in the directory of this project: 

1. Activate the virtual environment by running the command `.\.venv\Scripts\activate` (on Mac instead run `source ./venv/bin/activate`). 
2. To start the program, run the command `py .\src\main.py [data source] [flags...]`; if `py` isn't recognized, try `python` or `python3`. Specifying the data source is a required positional argument, while flags are largely optional and can be in any order. 

**Data Source**

User must include the data source type that will be used to set up the database. The currently available data source options are:

1. `past_log`: Reads in a .txt file that contains stream of CAN messages. Requires `--inputFile` flag.
2. `mock_livelog`: Simulates reading in live data from a .txt file that contains stream of CAN messages. Requires `--inputFile` flag.
3. `livelog`: 
4. `db`: Reads in a .db or .sql file that has been generated by this program.

**Flags**

`-i`, `--inputFile`: Specifies path of input file, must be followed by logfile path  
`-o`, `--outputDB`: Specifies the name of the output DB, name is autogenerated if not specified

## Navigating the user interface

TODO

## Overview of the Backend (for New Developers)

The backend uses a Producer-Consumer software pattern to produce CAN message entries from a given data source, and consume them into a central database SQLite file (CDB). The *consumer* module and various *producer* modules are kept in the `\src\backend\input` directory.

The backend also uses 2 custom objects to streamline this process: 

- To handle the processing of CAN messages, the backend uses the custom `CanMessage` object to represent a CAN Message.
- Anytime the program wants to interact with the CDB, it needs to use a `DbConnection` object that represents a connection from the code to the CDB, allowing the code to query, insert, etc. into the CDB in a thread safe manner. 

The backend flow of data is as follows: 

1. The user includes a data source (`past_log`, `mock_livelog`, etc.) when running the program. Based on the data source's type, the corresponding function from a producer module in `\src\backend\input` is called in `main.py` and provided with the data source path / location.
2. The producer function will then process the CAN messages from the data source and push them as a `tuple` into `queue`, which is a static queue that is shared between the `consumer` module and the various producer modules. 
3. Then a function from the `consumer` module will pop `tuples` from `queue`, then process the `tuple` and insert it into CDB. 