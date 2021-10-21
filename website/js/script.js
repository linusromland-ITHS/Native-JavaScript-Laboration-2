const inputField = document.querySelector("#searchBar");
const form = document.querySelector("form");
const errorContainer = document.querySelector("#error");
const userErrorTag = document.querySelector("#userError");
const repoErrorTag = document.querySelector("#repoError");
const historySearches = document.querySelector("#historySearches");
let history = [];

window.onload = () => {
    //Gets history from localStorage if exists.
    if (localStorage.getItem("history")) {
        history = JSON.parse(localStorage.getItem("history"));
        historySearches.hidden = false;
        history.forEach(item => {
            let ul = document.createElement("ul");
            let a = document.createElement("a");
            a.textContent = item;
            a.className = "historyItem"
            a.addEventListener("click", historySearch)
            ul.appendChild(a);
            historySearches.appendChild(ul);
        });
    }
};

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const value = inputField.value;
    search(value)
});

search = async (value) => {
    if (value) {
        //Checks if input includes /. (is repo or not)
        if (value.includes("/")) {
            let repo = await getRepo(value);
            if (repo) { //Checks if valid repo else displays error
                clearError();
                saveToHistory(value)
                window.location = `repo.html?repo=${value}`
            } else {
                repoError();
            }
        } else {
            let user = await getUser(value);
            if (user) { //Checks if valid user else displays error
                clearError();
                saveToHistory(value)
                window.location = `user.html?user=${value}`
            } else {
                userError();
            }
        }


    }
}

saveToHistory = (value) => {
    //Saves search to localStorage for history
    if (!history.includes(value)) {
        history.push(value);
        if (history.length > 5) history.shift();
    }
    localStorage.setItem("history", JSON.stringify(history));
}

historySearch = (input) => {
    search(input.target.textContent)
}

userError = () => {
    errorContainer.hidden = false;
    repoErrorTag.hidden = true;
    userErrorTag.hidden = false;
};

repoError = () => {
    errorContainer.hidden = false;
    repoErrorTag.hidden = false;
    userErrorTag.hidden = true;
};

clearError = () => {
    errorContainer.hidden = true;
    repoErrorTag.hidden = true;
    userErrorTag.hidden = true;
};