// Retrives of HTML DOM elements
const nameTag = document.querySelector("#name")
usernameTag = document.querySelector("#username")
loadingArea = document.querySelector("#loadingArea")
main = document.querySelector("#main")
mainContentArea = document.querySelector("#mainContentArea")
commitAmount = document.querySelector("#commitAmount")
topRepositories = document.querySelector("#topRepositories")
topRepositoriesList = document.querySelector("#topRepositories>ul")
profilePicture = document.querySelector("#profilePicture")
latestCommits = document.querySelector("#latestCommits")
latestCommitsList = document.querySelector("#latestCommits>ul")
bio = document.querySelector("#bio")
pullRequestsDOM = document.querySelector("#pullRequests")
pullRequestsList = document.querySelector("#pullRequests>ul")
issues = document.querySelector("#issues")
topLanguages = document.querySelector("#topLanguages")
topLanguagesList = document.querySelector("#topLanguages>ol")

let _user, _name;

window.onload = async () => {
    initPartials()

    //Convert URL to Params
    const urlSearchParams = new URLSearchParams(window.location.search);
    const params = Object.fromEntries(urlSearchParams.entries());

    //Gets user from GitHub API
    const user = await getUser(params.user);
    const userRepos = await getUserRepos(params.user)
    const pullRequests = await reposToPullRequests(userRepos)
    const issues = await reposToIssues(userRepos)
    const topLanguages = await reposToLanguages(userRepos);

    //Redirects client if user not found
    if (!user) window.location = "index.html"

    const events = await getEvents(user.login)
    const chartData = await eventArrayToChart(events)
    await renderChart(chartData.amount, chartData.day, "#chart", "line", "Commits")

    //Displays diffrent information on load of site
    displayName(user)
    displayTopRepos(chartData.topRepositories)
    displayCommitAmount(chartData)
    displayProfilePicture(user)
    displayLatestCommits(events)
    displayPullRequests(pullRequests)
    displayIssues(issues)
    displayTopLanguages(topLanguages)

    //Fake loading
    let fakeloading = true;
    setTimeout(() => {
        fakeloading = false;
        loading()
    }, 400)

    if (!fakeloading) loading()
    checkToken()
}

/**
 * @param  {object} user Object containing the user information
 * 
 * Sets the username DOMs and updated metadata.
 */
displayName = (user) => {
    //Sets varible "name" to login or Username if exsits.
    name = user.name ? user.name : user.login;
    document.title = `${user.login} - Github Statistics`
    nameTag.textContent = name

    //If GitHub profile has name set, shows login name in other field.
    if (user.name) {
        usernameTag.textContent = user.login
        usernameTag.hidden = false;
    }

    //If GitHub profile has bio set, shows bio in field.
    if (user.bio) {
        bio.textContent = user.bio
        bio.hidden = false;
    }

    document.querySelector('meta[name="description"]').setAttribute("content", `Github Statistics for user ${user.login}`);
}

/**
 * @param  {object} data Object containing all commits (amount and day)
 * 
 * Adds all commmits to one number and displays in DOM.
 */
displayCommitAmount = (data) => {
    let commits = data.amount.length > 0;
    if (commits) {
        data.amount.forEach(amount => {
            commits += parseInt(amount)
        });
        commitAmount.textContent = `Commits (${data.day[0]} - ${data.day[data.day.length -1]}): ${commits}`
        commitAmount.hidden = false;
    }
}

/**
 * @param  {array} arr Array Containing latest events
 * 
 * Converts latest events (input) and then displays 5 latest commits
 */
displayLatestCommits = (arr) => {
    arr = arr.reverse();

    const commits = []
    let i = 0;
    while (commits.length < 8 && arr.length > 0) {
        if (arr[i].type === "PushEvent") { // Checkes that event is of type PushEvent.
            arr[i].payload.commits.forEach(element => {
                commits.push({
                    commitInformation: arr[i],
                    commit: element
                })
                commits[commits.length - 1].commitInformation.payload = {};
            });
            if (i > arr.length) break;
        }
        i++;
    }
    const amount = commits.length > 8 ? 8 : commits.length

    if (amount) latestCommits.hidden = false;
    for (let i = 0; i < amount; i++) {
        const element = commits[i];
        const li = document.createElement("li");

        const a = document.createElement("a");
        a.href = `https://github.com/${element.commitInformation.repo.name}/commit/${element.commit.sha}`;

        const title = document.createElement("p")
        title.textContent = `Pushed to repository ${element.commitInformation.repo.name}`

        const message = document.createElement("p")
        message.textContent = `${element.commit.message}`

        const date = document.createElement("p")
        date.textContent = `${moment(element.commitInformation.created_at).calendar(null, {
            lastDay : '[Yesterday at] HH:mm',
            sameDay : '[Today at] HH:mm',
            nextDay : '[Tomorrow at] HH:mm',
            lastWeek : '[last] dddd [at] HH:mm',
            nextWeek : 'dddd [at] HH:mm',
            sameElse : 'L'
        })}`

        a.append(title, message, date)
        li.appendChild(a)

        latestCommitsList.appendChild(li)
    }
}

/**
 * @param  {array} arr Object array of the top repositories
 * 
 * Loops through the top repositories (max 5) and displays them in the DOM.
 */
 displayTopRepos = (arr) => {
    const amount = arr.length > 5 ? 5 : arr.length

    if (amount) topRepositories.hidden = false;
    for (let i = 0; i < amount; i++) {
        const element = arr[i];
        const li = document.createElement("li");
        li.innerHTML = `<a href="https://github.com/${element.repo}/"><p>${element.repo}</p><p>Commits: ${element.amount}</p></a>`
        topRepositoriesList.appendChild(li)
    }
}

/**
 * @param  {object} user Object containing the user information
 * 
 * Displays the profile picture of user in image DOM
 */
displayProfilePicture = (user) => {
    profilePicture.setAttribute('src', `${user.avatar_url}&s=250`)
}

/**
 * @param  {array} eventArray Array of Events directly from GitHub's API
 * 
 * Converts the eventArray from GitHub's API to a object with the amount of commits each day and the total number of commits in each repository.
 */
eventArrayToChart = (eventArray) => {
    eventArray = eventArray.reverse(); //reverse array to get oldest first

    const object = {
        amount: [],
        day: [],
        topRepositories: null,
    }

    const topRepositories = []

    for (let i = 0; i < eventArray.length; i++) { //Loops through commits
        const commit = eventArray[i];
        const date = moment(commit.created_at.split("T")[0]) //Converts date to momentObject
        const diff = date.diff(moment(object.day[object.day.length - 1]), "days")
        if (diff > 1) {
            const newDate = moment(object.day[object.day.length - 1])
            for (let i = 0; i < diff - 1; i++) {
                newDate.add(1, "days")
                object.day.push(newDate.format("YYYY-MM-DD"))
                object.amount.push(0)
            }
        }
        const index = object.day.findIndex((e) => e === date.format("YYYY-MM-DD")) //Checks if date is in date array
        if (index === -1) { // if date is not in array and either adds it or updates amount.
            object.day.push(date.format("YYYY-MM-DD"))
            object.amount.push(commit.payload.commits.length)
        } else {
            object.amount[index] += commit.payload.commits.length
        }

        const repoIndex = topRepositories.findIndex((e) => e.repo === commit.repo.name) //Checks if repo is in repo array
        if (repoIndex === -1) {
            topRepositories.push({
                repo: commit.repo.name,
                amount: commit.payload.commits.length
            })
        } else {
            topRepositories[repoIndex].amount += commit.payload.commits.length
        }
    }

    while (object.day.at(-1) !== moment(new Date()).format("YYYY-MM-DD")) {
        const newDate = moment(object.day.at(-1))
        newDate.add(1, "days")
        object.day.push(newDate.format("YYYY-MM-DD"))
        object.amount.push(0)
    }

    topRepositories.sort((a, b) => b.amount - a.amount) // Sorts array by no of commits
    object.topRepositories = topRepositories //Sets topRepositories to topRepositories in object

    return object
}

/**
 * @param  {array} dataPoints Data points for chart
 * @param  {array} categories Categories for chart
 * @param  {string} selector Selector (id, class etc. of DOM) to insert chart to
 * @param  {string} type Type of chart (line etc.)
 * @param  {string} name Name of Chart
 * 
 * Renders Chart to choosen DOM with inputed data
 */
renderChart = (dataPoints, categories, selector, type, name) => {
    if (dataPoints.length > 0) {
        var options = {
            chart: {
                type: type
            },
            series: [{
                name: name,
                data: dataPoints
            }],
            xaxis: {
                categories: categories
            },
            colors: ['#5065A8']
        }

        var chart = new ApexCharts(document.querySelector(selector), options);

        chart.render();
        document.querySelector(selector).hidden = false;
    }
}