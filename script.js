// DOM Elements
const promptform = document.querySelector(".prompt-form");
const promptInput = promptform.querySelector(".prompt-input");
const chatsContainer = document.querySelector(".chats-container");
const container = document.querySelector(".container");
const fileInput = promptform.querySelector("#file-input");
const fileUploadWrapper = promptform.querySelector(".file-upload-wrapper");
const themeToggle = document.querySelector("#theme-toggle-btn");

// Gemini API configuration
const API_KEY = "AIzaSyByeTeKzpdIskoiGIgYf8LY6o6cxnUmnqU";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

// Runtime variables
let typingInterval, controller;
const chatHistory = []; // Stores the chat history
const userData = { message: "", file: {} }; // User input data

// Function to create message HTML element
const createMsgElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
}

// Scroll chat to bottom
const scrollToBottom = () => container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });

// Typing effect animation for bot response
const typingEffect = (text, textElement, botMessagediv) => {
    textElement.textContent = "";
    const words = text.split(" ");
    let wordIndex = 0;

    typingInterval = setInterval(() => {
        if (wordIndex < words.length) {
            textElement.textContent += (wordIndex === 0 ? "" : " ") + words[wordIndex++];
            scrollToBottom();
        } else {
            clearInterval(typingInterval);
            botMessagediv.classList.remove("loading");
            document.body.classList.remove("bot-message");
        }
    }, 40);
}

// Generate bot response using Gemini API
const generateResponse = async (botMessagediv) => {
    const textElement = botMessagediv.querySelector(".message-text");
    controller = new AbortController(); // Allow stopping response generation

    // Build message for API call
    chatHistory.push({
        role: "user",
        parts: [
            { text: userData.message },
            ...(userData.file.data ? [{
                inline_data: (({ fileName, isImage, ...rest }) => rest)(userData.file)
            }] : [])
        ]
    });

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ contents: chatHistory }),
            signal: controller.signal
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error.message);

        // Clean up and extract bot response
        const responseText = data.candidates[0].content.parts[0].text.replace(/<[^>]*>/g, "").trim();

        typingEffect(responseText, textElement, botMessagediv);

        // Save bot message to history
        chatHistory.push({ role: "model", parts: [{ text: responseText }] });

    } catch (error) {
        textElement.style.color = "#d62939";
        textElement.textContent = error.name === "AbortError" ? "Response generation stopped." : error.message;
        botMessagediv.classList.remove("loading");
        document.body.classList.remove("bot-message");
    } finally {
        userData.file = {}; // Clear file data
    }
}

// Handle form submission
const handleFormSubmit = (e) => {
    e.preventDefault();
    const userMessage = promptInput.value.trim();
    if (!userMessage || document.body.classList.contains("bot-message")) return;

    promptInput.value = "";
    userData.message = userMessage;
    document.body.classList.add("bot-message", "chats-active");
    fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");

    // Create and append user message
    const userMessageElement = `
        <p class="message-text"></p>
        ${userData.file.data ? (
            userData.file.isImage ?
                `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attachment" />`
                : `<p class="file-attachment"><span class="material-symbols-outlined">description</span>${userData.file.fileName}</p>`
        ) : ""}
    `;
    const userMessageDiv = createMsgElement(userMessageElement, "user-message");
    userMessageDiv.querySelector(".message-text").textContent = userMessage;
    chatsContainer.appendChild(userMessageDiv);
    scrollToBottom();

    // Show bot typing message after delay
    setTimeout(() => {
        const botMessageElement = `<img src="./logo.svg" alt="avatar"><p class="message-text">Just a moment...</p>`;
        const botMessagediv = createMsgElement(botMessageElement, "bot-message", "loading");
        chatsContainer.appendChild(botMessagediv);
        scrollToBottom();
        generateResponse(botMessagediv); // Call API
    }, 400);
}

// File input handler (encode to base64)
fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (e) => {
        fileInput.value = "";
        const base64String = e.target.result.split(",")[1];
        fileUploadWrapper.querySelector(".file-preview").src = e.target.result;
        fileUploadWrapper.classList.add("active", isImage ? "img-attached" : "file-attached");

        userData.file = {
            fileName: file.name,
            data: base64String,
            mime_type: file.type,
            isImage
        };
    };
});

// Cancel file upload
document.querySelector("#cancel-file-btn").addEventListener("click", () => {
    userData.file = {};
    fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");
});

// Stop response generation
document.querySelector("#stop-response-btn").addEventListener("click", () => {
    userData.file = {};
    controller?.abort(); // Abort fetch request
    clearInterval(typingInterval);
    chatsContainer.querySelector(".bot-message.loading").classList.remove("loading");
    document.body.classList.remove("bot-message");
});

// Delete all chats
document.querySelector("#delete-chats-btn").addEventListener("click", () => {
    if(confirm("Do you want to clear Chat!")){
        chatHistory.length = 0;
        chatsContainer.innerHTML = "";
        document.body.classList.remove("bot-message", "chats-active");
    }
});

// Handle predefined prompt suggestions
document.querySelectorAll(".suggestion-item").forEach(item => {
    item.addEventListener("click", () => {
        promptInput.value = item.textContent;
        promptform.dispatchEvent(new Event("submit")); // Submit form programmatically
    });
});

// Show/hide input controls dynamically
document.addEventListener("click", ({ target }) => {
    const wrapper = document.querySelector(".prompt-wrapper");
    const shouldHide = target.classList.contains("prompt-input") || (
        wrapper.classList.contains("hide-controls") &&
        (target.id === "add-file-btn" || target.id === "stop-response-btn")
    );
    wrapper.classList.toggle("hide-controls", shouldHide);
});

// Toggle theme (dark/light)
themeToggle.addEventListener("click", () => {
    const isLightTheme = document.body.classList.toggle("light-theme");
    localStorage.setItem("theme", isLightTheme ? "light_mode" : "dark_mode");
    themeToggle.textContent = isLightTheme ? "dark_mode" : "light_mode";
});

// Set initial theme on page load
const isLightTheme = localStorage.getItem("themecolor") === "light_mode";
document.body.classList.toggle("light-theme", isLightTheme);
themeToggle.textContent = isLightTheme ? "dark_mode" : "light_mode";

// Main event listeners
promptform.addEventListener("submit", handleFormSubmit);
promptform.querySelector("#add-file-btn").addEventListener("click", () => fileInput.click());
