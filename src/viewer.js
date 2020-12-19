"use strict";

var dataByClass = {};

/**
 * Relative time formatting
 */

var MINUTE_MS = 1000 * 60;
var HOUR_MS = MINUTE_MS * 60;
var DAY_MS = HOUR_MS * 24;

/**
 * For a given date, returns the amount of seconds from the
 * start of the day of the date.
 * @param date {Date} the date
 * @returns the amount of seconds from the start of the day
 */
function getTimeOfDay(date) {
    return date.getHours() * HOUR_MS +
        date.getMinutes() * MINUTE_MS +
        date.getSeconds();
}

/**
 * Converts a difference between two {@code Date}s into a human
 * readable string in French.
 * @param from {Date} the starting date
 * @param to {Date} the target date
 */
function formatRelativeTime(from, to) {
    var diffMs = to.valueOf() - from.valueOf();
    var diffAbsMs = Math.abs(diffMs);

    function formatHelper(value, label) {
        var result = "";
        result += value > 0 ? "dans " : "il y a ";
        result += Math.abs(value);
        result += " ";
        result += label;
        if (Math.abs(value) > 1)
            result += "s";
        return result;
    }

    if (diffAbsMs < MINUTE_MS) {
        return "maintenant";
    } else if (diffAbsMs < 2 * HOUR_MS) {
        return formatHelper(Math.round(diffMs / MINUTE_MS), "minute");
    } else {
        // First take the difference in actual days between the two
        // time points.
        var diffDays = Math.trunc(diffMs / DAY_MS);
        // Then increment the count if midnight has passed between
        // from + diffDays * DAY_MS and to. In French, when we talk
        // a difference in days, we are actually talking about the
        // count of midnights between the two times. This code will
        // correct for this.
        var timeOfDayFrom = getTimeOfDay(from);
        var timeOfDayTo = getTimeOfDay(to);
        if (diffMs > 0 && timeOfDayTo < timeOfDayFrom) {
            diffDays++;
        } else if (diffMs < 0 && timeOfDayFrom < timeOfDayTo) {
            diffDays--;
        }
        if (diffDays === 0) {
            return formatHelper(Math.round(diffMs / HOUR_MS), "heure");
        } else if (diffDays === -2) {
            return "avant-hier";
        } else if (diffDays === -1) {
            return "hier";
        } else if (diffDays === 1) {
            return "demain";
        } else if (diffDays === 2) {
            return "après-demain";
        }
        return formatHelper(diffDays, "jour");
    }
}

/**
 * Search functionality
 */

var TOKEN_SPLIT_REGEX = /\W/;

/**
 * Remove accents and leading/final spaces from a name and converts
 * it to lower case.
 * @param name {string} the name to convert
 * @returns the new normalized name
 */
function normalizeName(name) {
    name = name.trim()
        .toLowerCase();
    // Remove accents
    return name.normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Computes a matching score between the tokens entered by the user
 * and tokens for a particular entry.
 * @param inputTokens {string[]} the tokens entered by the user
 * @param entryTokens {string[]} the tokens for a particular entry
 * @returns the matching score
 */
function getMatchingScore(inputTokens, entryTokens) {
    // Make a copy of the arrays because we are going to modify
    // them.
    inputTokens = inputTokens.slice();
    entryTokens = entryTokens.slice();

    var score = 0;
    while (inputTokens.length > 0) {
        var inputToken = inputTokens.pop();

        // Remove the closest match (that is, the token that matches
        // but that has the shortest length) so that the remaining
        // entry tokens can match with the remaining input tokens.
        var shortestMatchIndex = -1;
        var shortestMatchLength = Infinity;
        for (var i = 0; i < entryTokens.length; i++) {
            var entryToken = entryTokens[i];
            if (entryToken.length < shortestMatchLength &&
                entryToken.indexOf(inputToken) === 0) {
                shortestMatchIndex = i;
                shortestMatchLength = entryToken.length;
            }
        }

        if (shortestMatchIndex === -1) {
            // Return zero when at least one input token didn't
            // match with any of the entry's tokens.
            return 0;
        } else {
            score += inputToken.length;
            entryTokens.splice(shortestMatchIndex, 1);
        }
    }

    return score;
}

/**
 * Creates a new student object.
 * @param classData {object} the class data
 * @param group {number} the index of the student's group
 * @param index {number} the student's index in its group
 */
function Student(classData, group, index) {
    this.classData = classData;
    this.group = group;
    this.index = index;
}

/**
 * Returns the student's name.
 * @returns the student's name
 */
Student.prototype.getName = function() {
    return this.classData.groups[this.group].students[this.index];
};

/**
 * Returns a unique ID for the student.
 * @returns a unique ID for the student.
 */
Student.prototype.getId = function() {
    return this.classData.id * 1000000 +
        this.group * 1000 +
        this.index;
};

/**
 * Performs a search given an input from the user and returns the
 * student that was found.
 * @param classData {object} the selected class' data
 * @param input {string} the user input
 * @returns the student or null if none were found
 */
function searchStudent(classData, input) {
    var inputTokens = normalizeName(input)
        .split(TOKEN_SPLIT_REGEX);

    // Put the shortest tokens at the beggining of the array so that
    // they get matched last with the student name's tokens. Indeed,
    // if we have a name such as "AB AAAAAA" and the input is
    // "A AB", then we want to match the "AB" token first so that we
    // remove it and continue with the "AAAAAA" token. Otherwise,
    // the search will return no result.
    inputTokens.sort(function(a, b) {
        return a.length - b.length;
    });

    var bestMatchIndex = -1;
    var bestMatchScore = 0;
    var sameScoreCount = 0;
    for (var i = 0; i < classData.searchIndex.length; i++) {
        var score = getMatchingScore(inputTokens,
            classData.searchIndex[i].tokens);
        if (score > bestMatchScore) {
            bestMatchIndex = i;
            bestMatchScore = score;
            sameScoreCount = 0;
        } else if (score === bestMatchScore) {
            sameScoreCount++;
        }
    }

    // Multiple matches with the same score means that we aren't
    // sure.
    if (bestMatchIndex === -1 || sameScoreCount > 0)
        return null;

    var bestMatch = classData.searchIndex[bestMatchIndex];
    return new Student(classData, bestMatch.group, bestMatch.index);
}

/**
 * UI interface
 */

var dom = {
    // Search form
    classSelect: document.getElementById("class-select"),
    nameInput: document.getElementById("name-input"),
    loading: document.getElementById("loading"),

    // Student information
    studentInfo: document.getElementById("student-info"),
    studentName: document.getElementById("student-name"),
    studentGroupNumber: document.getElementById("student-group-number"),
    collesWeeks: document.getElementById("student-colles-weeks"),
    dataCredits: document.getElementById("data-credits-list"),
};

var uiState = {
    selectedClass: null,
    loadingHidden: true,
    studentInfoHidden: true,
    studentId: null,
    dataCreditsDirty: true,
};

function registerEventListeners() {
    dom.classSelect.addEventListener("change", function(e) {
        var classId = dom.classSelect.value;

        // Remember the class so that the user doesn't have to type
        // it after the page is closed and opened again.
        if (window.localStorage !== undefined)
            localStorage.setItem("class", classId);
        
        if (uiState.selectedClass === classId)
            return;
        uiState.selectedClass = classId;

        loadClassData(classId)
            .then(function() {
                // Only refresh the view if the selected class was
                // not changed in between the load start and end.
                if (uiState.selectedClass !== classId)
                    return;

                // Recreate class dependent elements
                uiState.dataCreditsDirty = true;

                refreshView();
            });
        
        // Show loader
        refreshView();
    });

    dom.nameInput.addEventListener("input", function(e) {
        // Remember the name so that the user doesn't have to type
        // it after the page is closed and opened again.
        if (window.localStorage !== undefined)
            localStorage.setItem("name", dom.nameInput.value);

        refreshView();
    });
}

function createColleElement(classData, colle) {
    var $colle = document.createElement("li");
    $colle.classList.add("colle");
    $colle.classList.add("colle--" + colle.state);
    $colle.classList.add("colle--subject-" + colle.subject);

    var $subject = document.createElement("p");
    $subject.classList.add("colle__subject");
    $subject.textContent = classData.subjects[colle.subject];
    $colle.appendChild($subject);

    var DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
    var day = DAYS[colle.day];

    var $info = document.createElement("p");
    $info.classList.add("colle__info");
    $info.appendChild(document.createTextNode(classData.teachers[colle.teacher]));

    if (colle.room !== undefined) {
        $info.appendChild(document.createElement("br"));
        $info.appendChild(document.createTextNode("Salle " + colle.room));
    }

    $info.appendChild(document.createElement("br"));
    $info.appendChild(document.createTextNode(day + " à " +
        colle.startTime.getHours() + " h (" +
        formatRelativeTime(new Date(), colle.startTime) + ")"));
    $colle.appendChild($info);

    return $colle;
}

function createWeekElement(classData, week) {
    var $week = document.createElement("section");
    $week.classList.add("week");

    var $weekTitle = document.createElement("h1");
    $weekTitle.classList.add("week__title");
    $weekTitle.textContent = "Semaine " + (week.index + 1) + " (" + week.day + "/" + week.month + ")";
    $week.appendChild($weekTitle);

    var $colles = document.createElement("ul");
    $colles.classList.add("week__colles");
    for (var i = 0; i < week.colles.length; i++)
        $colles.appendChild(createColleElement(classData, week.colles[i]));
    $week.appendChild($colles);

    return $week;
}

function createCreditsElement(name) {
    var $item = document.createElement("li");
    $item.classList.add("data-credits--name");
    $item.innerText = name;

    return $item;
}

function getWeeksForGroup(classData, groupIndex) {
    var result = [];
    var now = new Date();

    var weeks = classData.groups[groupIndex].weeks;
    for (var i = 0; i < weeks.length; i++) {
        var weekParts = classData.weeks[i].split("-");
        var year = parseInt(weekParts[0]);
        var month = parseInt(weekParts[1]);
        var day = parseInt(weekParts[2]);

        var insert = [];
        result.push({
            colles: insert,
            index: i,
            day,
            month,
        });

        for (var j = 0; j < weeks[i].length; j++) {
            var colle = weeks[i][j];
            var colleType = classData.colles[colle];

            var startTime = new Date(year, month - 1, day, colleType.time);
            startTime.setDate(startTime.getDate() + colleType.day);

            var state;
            if (now.valueOf() - startTime.valueOf() > 1000 * 60 * 60) {
                state = "done";
            } else if (startTime.valueOf() - now.valueOf() >= 1000 * 60 * 60) {
                state = "soon";
            } else {
                state = "waiting";
            }

            insert.push({
                startTime: startTime,
                state: state,
                day: colleType.day,
                subject: colleType.subject,
                teacher: colleType.teacher,
                room: colleType.room,
            });
        }
    }

    return result;
}

function refreshView() {
    var classData = dataByClass[uiState.selectedClass];

    var loadingHidden = classData !== undefined ||
        dom.nameInput.value.trim() === "";
    if (loadingHidden !== uiState.loadingHidden) {
        if (loadingHidden) {
            dom.loading.classList.add("loading--hidden");
        } else {
            dom.loading.classList.remove("loading--hidden");
        }
        uiState.loadingHidden = loadingHidden;
    }

    var student = classData === undefined ? null :
        searchStudent(classData, dom.nameInput.value);

    var studentInfoHidden = student === null;
    if (studentInfoHidden !== uiState.studentInfoHidden) {
        if (studentInfoHidden) {
            dom.studentInfo.classList.add("student-info--hidden");
        } else {
            dom.studentInfo.classList.remove("student-info--hidden");
        }
        uiState.studentInfoHidden = studentInfoHidden;
    }

    if (!studentInfoHidden) {
        var studentId = student.getId();
        if (studentId !== uiState.studentId) {
            dom.studentName.textContent = student.getName();
            dom.studentGroupNumber.textContent = student.group + classData.firstGroup;

            var weeks = getWeeksForGroup(classData, student.group);
            // Remove weeks where all colles are already done.
            weeks = weeks.filter(function(w) {
                return w.colles
                    .some(function(c) {
                        return c.state !== "done";
                    });
            });

            while (dom.collesWeeks.firstChild !== null)
                dom.collesWeeks.removeChild(dom.collesWeeks.firstChild);
            for (var i = 0; i < weeks.length; i++)
                dom.collesWeeks.appendChild(createWeekElement(classData, weeks[i]));

            uiState.studentId = studentId;
        }

        if (uiState.dataCreditsDirty) {
            while (dom.dataCredits.firstChild !== null)
                dom.dataCredits.removeChild(dom.dataCredits.firstChild);
            for (var i = 0; i < classData.credits.length; i++)
                dom.dataCredits.appendChild(createCreditsElement(classData.credits[i]));

            uiState.dataCreditsDirty = false;
        }
    }
}

/**
 * Data loading
 */

var pendingLoad = {};
var idCounter = 0;

/**
 * Loads the data for a given class ID. A promise is returned that
 * resolves when the data is finished loading.
 * @param classId {string} the id of the class' data to load
 * @returns a promise that resolves on completion
 */
function loadClassData(classId) {
    if (dataByClass[classId] !== undefined)
        return Promise.resolve();
    
    // Check if the date is already being loaded (this can happen if
    // the user switches to another class and then switches back to
    // this class).
    if (pendingLoad[classId] !== undefined) {
        return new Promise(function(resolve, reject) {
            pendingLoad[classId].push(resolve);
        });
    }
    
    return new Promise(function(resolve, reject) {
        var resolveFunctions = [];
        resolveFunctions.push(resolve);

        pendingLoad[classId] = resolveFunctions;

        fetch("data/" + classId + ".json")
            .then(function(response) {
                if (!response.ok)
                    throw new Error("response is not OK");
                return response.json();
            })
            .then(function(responseJson) {
                var classData = responseJson;

                classData.id = idCounter++;

                // Tokenize the names right away to make searching
                // faster.
                classData.searchIndex = [];
                for (var i = 0; i < classData.groups.length; i++) {
                    var groupStudents = classData.groups[i].students;
                    for (var j = 0; j < groupStudents.length; j++) {
                        classData.searchIndex.push({
                            tokens: normalizeName(groupStudents[j])
                                .split(TOKEN_SPLIT_REGEX),
                            group: i,
                            index: j,
                        });
                    }
                }

                dataByClass[classId] = classData;
                
                // Call the resolve functions for every promise.
                for (var i = 0; i < resolveFunctions.length; i++)
                    resolveFunctions[i]();
                
                pendingLoad[classId] = null;
            })
            .catch(function(err) {
                console.error("failed to load data", err);
            });
    });
}

/**
 * Entry point and resource loading
 */

function loadPreviousValues() {
    // Fill the inputs with the values that were entered previously
    // before the page was closed.
    if (window.localStorage !== undefined) {
        var previousClass = localStorage.getItem("class");
        if (previousClass !== null) {
            dom.classSelect.value = previousClass;
            uiState.selectedClass = previousClass;
        }

        var previousName = localStorage.getItem("name");
        if (previousName !== null) {
            dom.nameInput.value = previousName;

            // Initial search
            refreshView();
        }
    }

    if (uiState.selectedClass === null)
        uiState.selectedClass = dom.classSelect.value;
}

function main() {
    loadPreviousValues();

    var classId = uiState.selectedClass;
    loadClassData(classId)
        .then(function() {
            if (uiState.selectedClass !== classId)
                return;
            refreshView();
        });
    
    registerEventListeners();
}

function loadPolyfillsAsync(cb) {
    if (Math.trunc === undefined) {
        Math.trunc = function(v) {
            return v < 0 ? Math.ceil(v) : Math.floor(v);
        };
    }

    var POLYFILLS = [
        { check: window.Promise, url: "https://cdn.jsdelivr.net/npm/promise-polyfill@8.1.3/dist/polyfill.min.js" },
        { check: window.fetch, url: "https://cdn.jsdelivr.net/npm/whatwg-fetch@3.4.1/dist/fetch.umd.js" },
        { check: String.prototype.normalize, url: "https://cdn.jsdelivr.net/npm/unorm@1.6.0/lib/unorm.js" }
    ];

    var pending = 0;

    for (var i = 0; i < POLYFILLS.length; i++) {
        var polyfill = POLYFILLS[i];
        if (polyfill.check !== undefined)
            continue;

        var $script = document.createElement("script");
        $script.src = polyfill.url;
        $script.onload = function(e) {
            pending--;
            if (pending === 0)
                cb();
        };
        $script.onerror = function(e) {
            console.error("failed to load polyfill", e);
        };
        document.head.appendChild($script);
        
        pending++;
    }

    if (pending === 0)
        cb();
}

function loadFontAsync() {
    var $link = document.createElement("link");
    $link.rel = "stylesheet";
    $link.href = "https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap";
    document.head.appendChild($link);
}

loadFontAsync();
loadPolyfillsAsync(main);

if ("serviceWorker" in navigator) {
    navigator.serviceWorker
        .register("sw.js")
        .then(function() {
            console.log("successfully registered service worker");
        });
}