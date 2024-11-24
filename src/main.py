import argparse
from src.backend.db_connection import DbConnection
from src.socket.socket import socketio, app
from src.backend.input import consumer, logfileProd
from functools import partial

database_path = "./src/can_database.sqlite"
datafile_path = "./logging_data2.txt"

def main(): 
    cli_message_reader()


def cli_message_reader():
    parser = argparse.ArgumentParser() # not quite sure how to set this in app.py
    parser.add_argument("--liveData", type=str,
                        help="The path to the live data file.")
    parser.add_argument("--inputFile", type=str,
                        help="specifies path of input file")
    parser.add_argument("--outputDB", type=str, default=None,
                        help="specifies the name of the output DB, name is autogenerated if not specified")
    parser.add_argument("--set_dbc_branch", type=str, 
                        help="sets the branch of the DBC files submodule")
    args = parser.parse_args()
    #print(args.inputFile)
    #print(args.outputDB)
    #print(args.set_dbc_branch)


if __name__ == "__main__":
    main()

    # need to call .set_up_tables and .setup_database_oath here!! (before running threads)
    DbConnection.setup_the_db_path(database_path)

    dbconnection = DbConnection()
    dbconnection.setup_the_tables()

    socketio.start_background_task(target=consumer.process_data_live)
    socketio.start_background_task(target=partial(logfileProd.process_logfile_live, datafile_path))
    socketio.run(app, debug=True, allow_unsafe_werkzeug=True)  # to run the socket io app, .run is blocking! No code below this
