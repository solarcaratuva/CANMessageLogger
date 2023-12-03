import sys
import os
import re
import pyperclip as clipboard


def getFileData(filepath: str) -> list:
    if not os.path.exists(filepath):
        print(f"File \"{filepath}\" does not exist")
        quit()
    file = open(filepath, "r")
    data = file.readlines()
    file.close()
    return data

def handleBoardData(lines: list) -> str:
    pattern = r'Sent CAN message with ID ([0-9A-Za-z]+) Length ([0-9]+) Data ([0-9A-Za-z]+)'
    count = 1
    output = ""
    for line in lines:
        match = re.search(pattern, line)
        if match == None:
            continue
        ID = match.group(1)
        data = match.group(3)
        output += f"Message {count}, ID {ID}, Data {data}\n"
        count += 1
    return output

def handlePiData(lines: list) -> str: #TODO
    return "TODO"


# arg1 is board data file, arg2 is Pi data file
# use https://text-compare.com/
if len(sys.argv) != 3:
    print("2 CLI args expected")
    quit()

boardFile = sys.argv[1]
boardData = getFileData(boardFile)
piFile = sys.argv[2]
piData = getFileData(piFile)
print("Successfully imported data")


boardData = handleBoardData(boardData)
piData = handlePiData(piData)
print("Successfully processed data")

clipboard.copy(boardData)
print("Copied board data to clipboard")
input("*** Press Enter to continue ***")
clipboard.copy(piData)
print("Copied Pi data to clipboard")