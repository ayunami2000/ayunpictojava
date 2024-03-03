nintendo's ds pictochat recreated for browsers

SELF HOSTING :

  prerequisite : git, gradle, java installed on your computer/server

(all of theses steps happens in the terminal)
1) clone the repository with the git command in your user folder
2) get in the newly created folder with the cd command
3) run the command "sudo chmod +x gradlew" (without the "")
4) run the command "sudo ./gradlew build"
5) once this step is done (signalised by the message "BUILD SUCCESSFUL in []s"), a new folder will have been created called build/ (this folder is owned by root so make sure to use the sudo command to be able to access it)
6) go into this build folder, then into the libs folder
7) you will see a file named ayunpictojava-1.0-SNAPSHOT.jar or an equivalent, you then need to run this file with the command "java -jar ayunpictojava-1.0-SNAPSHOT.jar" (if in the future the file isnt named exactly that, replace it with its new name)
8) you should see a line in the terminal saying that the server is running on 127.0.0.1:8080

changing the port :

without any changes, the port is in localhost, so unavailable to anyone in your network, if you want to make it available for other users you need to change the port by :
in the terminal, in the folder containing the .jar file and AFTER it has been run at least once, run the command "sudo nano settings.json"
you will then see a "port" and a "host" line, the port doesnt need to be changed but can be, the port should be changed to the local ip adress of the machine running this jar file
exist and save the changes, once you lunch the server it will run on the local ip adress you gave it
