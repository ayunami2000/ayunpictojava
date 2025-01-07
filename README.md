# Pictochat Online

Pictochat for the Nintendo DS & DSi, recreated for browsers!

# NOTICE: this project does NOT endorse nor is associated with ANY crypto or NFT projects

don't get scammed kthx

## In-app commands
- `!block` / `!ignore` / `!unblock` / `!unignore` - Hide/unhide the messages of someone temporarily.
- `!tripcode` / `!tc` - When provided with a password, will generate a tripcode and send it as the server. Used for verification that someone is who they say they are.
- `!list` / `!l` - Lists online users.

## Discord commands
- `!list` / `!l` - Lists online users.

## Self hosting
You will need:
- Git
- Gradle
- Java 8+ (JDK)

(All of theses steps happens in the terminal/command line)
1) Clone the repository with the git command (`git clone https://github.com/ayunami2000/ayunpictojava`)
2) Get in the newly created folder with the cd command (`cd ayunpictojava`)
3) Make gradlew executable (`chmod +x gradlew`) (Windows: skip this step)
4) Build the project with gradle (`./gradlew build`) (Windows: `gradlew.bat build`)
5) Once you see the message "BUILD SUCCESSFUL in []s", a new folder will have been created called `build`
6) Go into this build folder, then into the libs folder
7) You will see a file named ayunpictojava-1.0-SNAPSHOT.jar or an equivalent, this is the compiled program!
8) Copy this file to its' own folder for running, and run it (`java -jar ayunpictojava-1.0-SNAPSHOT.jar`) (or whatever the .jar file is named)
9) You should see a line in the terminal saying that the server is running on 127.0.0.1:8080, once you see this you can try it out at http://localhost:8080

### Changing the port and bind address
By default, the application will bind to the local address and port 8080. This means that by default it will not be accessible to anyone else on your network.
To make it accessible, edit the `settings.json` file that is generated after being run at least once, and set host to `0.0.0.0` or `::`. Rerun the program to apply changes.
You can change the port and other configurable settings as well in a similar manner.

### Making tripcodes unique
To make tripcodes unique and reduce the risk of cracking, in the `settings.json` file, set the `tripcode_secret` to something unique and do not share it.

### The captcha
To use the captcha, set the `secret` in the settings.json to your Cloudflare Turnstile captcha secret.
To disable the captcha entirely, edit the `www/index.html` file and search for `let token = false;` and change it to `let token = true;`. Then, remove or comment out the `<div id="captcha" ...` element and the `<script src="https://challenges.cloudflare.com/ ...` element.
