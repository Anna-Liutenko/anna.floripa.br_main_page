(function() {
    const widgetStyles = `
        .translator-widget {
            position: fixed; bottom: 20px; right: 20px; width: 350px; height: 500px;
            background: white; border: 1px solid #ddd; border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            z-index: 10000; display: flex; flex-direction: column;
        }
        .translator-widget.closed { height: 60px; cursor: pointer; }
        .translator-header { background: #2196F3; color: white; padding: 15px; border-radius: 10px 10px 0 0; font-weight: bold; display: flex; justify-content: space-between; align-items: center; }
        .translator-toggle { background: none; border: none; color: white; font-size: 18px; cursor: pointer; }
        .translator-chat { flex: 1; padding: 10px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
        .translator-message { padding: 10px 14px; border-radius: 12px; max-width: 85%; word-wrap: break-word; line-height: 1.4; font-size: 14px; }
        .translator-message.user { background: #e3f2fd; align-self: flex-end; margin-left: auto; color: #1976d2; border: 1px solid #bbdefb; }
        .translator-message.bot { background: #f8f9fa; align-self: flex-start; color: #212529; border: 1px solid #e9ecef; }
        .from-label { font-weight: bold; color: #6c757d; margin-bottom: 8px; font-size: 12px; }
        .translator-input-area { padding: 10px; border-top: 1px solid #eee; display: flex; gap: 8px; }
        .translator-input { flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 20px; outline: none; }
        .translator-input:focus { border-color: #2196F3; }
        .translator-send { padding: 10px 15px; background: #2196F3; color: white; border: none; border-radius: 20px; cursor: pointer; }
        .translator-send:hover { background: #1976d2; }
        .translator-send:disabled { background: #ccc; cursor: not-allowed; }
        @media (max-width: 768px) { .translator-widget { width: 90%; right: 5%; left: 5%; } }
    `;

    const styleSheet = document.createElement("style");
    styleSheet.textContent = widgetStyles;
    document.head.appendChild(styleSheet);

    const widget = document.createElement("div");
    widget.className = "translator-widget";
    widget.innerHTML = "<div class=\"translator-header\"><span>TBuddy</span><button class=\"translator-toggle\">−</button></div><div class=\"translator-chat\" id=\"translator-chat\"><div class=\"translator-message bot\">👋 Hi! I am translation bot TBuddy. What is your name?</div></div><div class=\"translator-input-area\"><input type=\"text\" class=\"translator-input\" id=\"translator-input\" placeholder=\"Type your name...\" /><button class=\"translator-send\" id=\"translator-send\">Send</button></div>";

    document.body.appendChild(widget);

    const toggleBtn = widget.querySelector(".translator-toggle");
    const chatArea = widget.querySelector(".translator-chat");
    const input = widget.querySelector(".translator-input");
    const sendBtn = widget.querySelector(".translator-send");

    let isOpen = true;
    let sessionId = "widget-" + Math.random().toString(36).substr(2, 9);
    let userName = "";
    let step = "name";

    function toggleWidget() {
        isOpen = !isOpen;
        if (isOpen) {
            widget.classList.remove("closed");
            toggleBtn.textContent = "−";
        } else {
            widget.classList.add("closed");
            toggleBtn.textContent = "+";
        }
    }

    toggleBtn.addEventListener("click", toggleWidget);

    function addMessage(text, isUser) {
        const message = document.createElement("div");
        message.className = "translator-message " + (isUser ? "user" : "bot");
        
        if (!isUser && text.includes("from " + userName)) {
            const parts = text.split("\n\n");
            if (parts.length > 1 && parts[0].includes("from")) {
                const fromDiv = document.createElement("div");
                fromDiv.className = "from-label";
                fromDiv.textContent = parts[0];
                message.appendChild(fromDiv);
                
                const contentDiv = document.createElement("div");
                contentDiv.innerHTML = parts.slice(1).join("\n\n").replace(/\n/g, "<br>");
                message.appendChild(contentDiv);
            } else {
                message.innerHTML = text.replace(/\n/g, "<br>");
            }
        } else {
            message.innerHTML = text.replace(/\n/g, "<br>");
        }
        
        chatArea.appendChild(message);
        
        const messages = chatArea.querySelectorAll(".translator-message");
        if (messages.length > 20) {
            messages[1].remove();
        }
        
        chatArea.scrollTop = chatArea.scrollHeight;
    }

    function updatePlaceholder(text) {
        input.placeholder = text;
    }

    async function sendMessage() {
        const text = input.value.trim();
        if (!text) return;

        addMessage(text, true);
        input.value = "";
        sendBtn.disabled = true;
        sendBtn.textContent = "...";

        try {
            if (step === "name") {
                userName = text;
                step = "languages";
                
                addMessage("Nice to meet you, " + userName + "! Let us set languages: just type 2 or 3 languages you want to use.\n\nExamples:\n- \"I want English, Spanish, French\"\n- \"Russian, Korean, Japanese\"\n- \"English and German\"", false);
                updatePlaceholder("Enter languages...");
                
            } else if (step === "languages") {
                const response = await fetch("/api/setup-languages", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Session-ID": sessionId
                    },
                    body: JSON.stringify({ languageInput: text })
                });

                const data = await response.json();
                
                if (response.ok) {
                    step = "ready";
                    addMessage("✅ Languages have been set up successfully!\n\n" + data.message, false);
                    updatePlaceholder("Type text to translate...");
                } else {
                    addMessage("Sorry, I could not set up those languages. Please try again with clear language names like English, Spanish, French", false);
                }
                
            } else if (step === "ready") {
                const response = await fetch("/api/translate", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Session-ID": sessionId
                    },
                    body: JSON.stringify({ text: text })
                });

                const data = await response.json();
                
                if (response.ok) {
                    if (data.translation) {
                        addMessage("from " + userName + "\n\n" + data.translation, false);
                    } else {
                        addMessage(data.message || "Translation completed!", false);
                    }
                } else {
                    addMessage("Sorry, there was an error with the translation. Please try again.", false);
                }
            }
        } catch (error) {
            addMessage("Sorry, I could not process your request. Please try again.", false);
        }

        sendBtn.disabled = false;
        sendBtn.textContent = "Send";
    }

    sendBtn.addEventListener("click", sendMessage);
    input.addEventListener("keypress", function(e) {
        if (e.key === "Enter") {
            sendMessage();
        }
    });

})();
