function sendMessage() {
    var input = document.getElementById("user-input");
    var chatBox = document.getElementById("chat-box");

    if (!input || !chatBox) {
        alert("Error: Chat input or chat box not found!");
        return;
    }

    var message = input.value.trim();

    if (message === "") {
        alert("Please type a message first!");
        return;
    }

    // Display user's message
    var userMessage = document.createElement("div");
    userMessage.className = "user-message";
    userMessage.textContent = message;

    chatBox.appendChild(userMessage);

    // Get chatbot response
    var reply = getBotReply(message);

    // Display chatbot response
    var botMessage = document.createElement("div");
    botMessage.className = "bot-message";
    botMessage.textContent = reply;

    chatBox.appendChild(botMessage);

    // Clear the input
    input.value = "";

    // Scroll to the latest message
    chatBox.scrollTop = chatBox.scrollHeight;
}


// Answers about your 25 project features
function getBotReply(message) {
    var text = message.toLowerCase();

    if (text.includes("hello") || text.includes("hi")) {
        return "Hello! Welcome to the Student Campus Assistant!";
    }

    if (text.includes("your name")) {
        return "I am your Student Campus Assistant chatbot.";
    }

    if (text.includes("project")) {
        return "Our project helps students discover college events, find scholarships, manage tasks, track achievements, and connect with teammates.";
    }

    if (text.includes("eventradar")) {
        return "EventRadar helps students discover hidden events, club activities, and departmental events.";
    }

    if (text.includes("hackathon")) {
        return "Hackathon and Event Discovery helps students find hackathons, workshops, and competitions.";
    }

    if (text.includes("scholarship")) {
        return "Scholarship Finder helps students explore scholarships, eligibility criteria, deadlines, and application links.";
    }

    if (text.includes("eventwallet") || text.includes("budget")) {
        return "EventWallet helps students track registration fees, travel expenses, food costs, and total event spending.";
    }

    if (text.includes("teammate")) {
        return "Teammate Finder connects students who have similar skills and interests.";
    }

    if (text.includes("dashboard")) {
        return "The Student Dashboard displays overall activity, progress, and upcoming deadlines.";
    }

    if (text.includes("task") || text.includes("deadline")) {
        return "The Task and Deadline Manager lets students create tasks, set priorities, and manage due dates.";
    }

    if (text.includes("calendar")) {
        return "The Calendar and Day Planner organizes events, tasks, and deadlines.";
    }

    if (text.includes("achievement")) {
        return "The Achievement Tracker records achievements and milestones. The platform can also award milestone badges.";
    }

    if (text.includes("progress")) {
        return "The Progress Tracker helps students monitor goals, completed tasks, and personal growth.";
    }

    if (text.includes("notification")) {
        return "The Notifications Center provides reminders about registrations, deadlines, and important updates.";
    }

    if (text.includes("login") || text.includes("signup")) {
        return "Login and Signup allow students to create accounts and access them securely.";
    }

    if (text.includes("profile")) {
        return "The Student Profile stores skills, interests, course, academic year, and achievements.";
    }

    if (text.includes("organizer")) {
        return "The Organizer Dashboard allows event organizers to publish and manage events.";
    }

    if (text.includes("responsive")) {
        return "Responsive UI makes the website usable on phones, tablets, and computers.";
    }

    if (text.includes("community")) {
        return "Campus Community allows students to share posts, discuss topics, and interact.";
    }

    if (text.includes("motivation")) {
        return "Motivational Notifications encourage students when they are inactive or have pending goals.";
    }

    if (text.includes("search") || text.includes("filter")) {
        return "Search, Filters and Sorting help students find relevant events and opportunities.";
    }

    if (text.includes("reminder")) {
        return "Event Reminders notify students about upcoming events and registration deadlines.";
    }

    if (text.includes("opportunity")) {
        return "Opportunity Recommendations suggest events and scholarships based on students' skills and interests.";
    }

    if (text.includes("last achievement")) {
        return "The Last Achievement Counter shows the number of days since the last recorded achievement.";
    }

    if (text.includes("tracker")) {
        return "Our platform includes event tracking, achievement tracking, and progress tracking.";
    }

    if (text.includes("how are you")) {
        return "I am doing great! What would you like to know about our project?";
    }

    if (text.includes("thank")) {
        return "You're welcome! Ask me another question.";
    }

    if (text.includes("bye")) {
        return "Goodbye! Best of luck with your project!";
    }

    return "I don't have an answer for that yet. Try asking about events, scholarships, EventRadar, EventWallet, or student achievements.";
}


// Allow Enter key to send messages
document.addEventListener("DOMContentLoaded", function () {
    var input = document.getElementById("user-input");

    if (input) {
        input.addEventListener("keydown", function (event) {
            if (event.key === "Enter") {
                sendMessage();
            }
        });
    }
});