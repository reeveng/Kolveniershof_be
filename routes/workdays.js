let express = require('express');
let router = express.Router();
let mongoose = require('mongoose');
let Workday = mongoose.model("Workday");
let Comment = mongoose.model("Comment");
let jwt = require('express-jwt');

let auth = jwt({ secret: process.env.KOLV02_BACKEND_SECRET });

/* GET workdays */
router.get('/', auth, function(req, res, next) {
    let query = Workday.find().sort('date');
    populateWorkdays(query);
    query.exec(function(err, workdays) {
        if (err) return next(err);
        res.json(workdays);
    });
});

/* GET workday by id */
router.param("workdayId", function (req, res, next, id) {
    let query = Workday.findById(id);
    populateWorkdays(query);
    query.exec(function (err, workday) {
        if (err) return next(err);
        if (!workday) return next(new Error("No Workday found with id: " + id));
        req.workday = workday;
        return next();
    });
});
router.get("/id/:workdayId", auth, function (req, res, next) {
    res.json(req.workday);
});

/* GET workday by date */
router.param("date", function (req, res, next, dateString) {
    // Check if date is correctly formatted
    let dateRegex = /^(?:(?:31(_)(?:0?[13578]|1[02]))\1|(?:(?:29|30)(_)(?:0?[13-9]|1[0-2])\2))(?:(?:1[6-9]|[2-9]\d)?\d{2})$|^(?:29(_)0?2\3(?:(?:(?:1[6-9]|[2-9]\d)?(?:0[48]|[2468][048]|[13579][26])|(?:(?:16|[2468][048]|[3579][26])00))))$|^(?:0?[1-9]|1\d|2[0-8])(_)(?:(?:0?[1-9])|(?:1[0-2]))\4(?:(?:1[6-9]|[2-9]\d)?\d{2})$/gm;
    if (!dateString.match(dateRegex))
        return res.status(400).json("Please insert a valid date (format: DD_MM_YYYY).");
    // Create new date
    let date = new Date(dateString.split("_")[2]+"-"+dateString.split("_")[1]+"-"+dateString.split("_")[0]);

    let query = Workday.findOne({ date: date });
    populateWorkdays(query);
    query.exec(function (err, workday) {
        if (err) return next(err);
        if (!workday) return next(new Error("No Workday found on date: " + date));
        req.workday = workday;
        return next();
    });
});
router.get("/date/:date", auth, function (req, res, next) {
    res.json(req.workday);
});

/* GET workdays from week by date in week */
router.param("weekdate", function (req, res, next, dateString) {
    if(!checkDateFormat(dateString))
        return res.status(400).json("Please insert a valid date (format: DD_MM_YYYY).");
    const dates = getWeek(dateString);

    let query = Workday.find({ date: { $in: dates } }).sort('date');
    populateWorkdays(query);
    query.exec(function (err, workdays) {
        if (err) return next(err);
        if (!workdays) return next(new Error("No Workdays found on date"));
        req.workdays = workdays;
        return next();
    });
});
router.get("/week/:weekdate", auth, function (req, res, next) {
    res.json(req.workdays);
});

/* GET workday by date by user */
router.get("/date/:date/:userId", auth, function (req, res, next) {
    // Check permissions
    if (!req.user.admin) {
        if (req.user._id !== req.params.userId) return res.status(401).end();
    }

    res.json(createClientWorkdayByWorkday(req.workday, req.params.userId));
});

/* GET workdays from week by date in week by user */
router.get("/week/:weekdate/:userId", auth, function (req, res, next) {
    // Check permissions
    if (!req.user.admin)
        if (req.user._id !== req.params.userId) return res.status(401).end();

    let clientWorkdays = [];
    req.workdays.forEach(workday => {
        let clientWorkday = createClientWorkdayByWorkday(workday, req.params.userId);
        clientWorkday ? clientWorkdays.push(clientWorkday) : null;
    });

    res.json(clientWorkdays);
});

/* POST workday */
router.post("/", auth, function (req, res, next) {
    // Check permissions
    if (!req.user.admin) return res.status(401).end();

    let workday = new Workday({
        date: req.body.date,
        originalTemplateName: req.body.originalTemplateName,
        originalWeekNumber: req.body.originalWeekNumber,
        notes: req.body.notes,
        dayActivities: req.body.dayActivities,
        daycareMentors: req.body.daycareMentors,
        morningBusses: req.body.morningBusses,
        amActivities: req.body.amActivities,
        lunch: req.body.lunch,
        pmActivities: req.body.pmActivities,
        holiday: req.body.holiday
    });
    workday.save(function (err, workday) {
        if (err) return next(err);
        res.json(workday);
    });
});

/* Create empty week */
router.post("/week/:weekdate", auth, function (req, res, next) {
    // Check permissions
    if (!req.user.admin) return res.status(401).end();

    if (req.workdays.length !== 0) return res.status(409).send("Week not empty");

    // Create workdays for full week
    let workdays = [];
    getWeek(req.params.weekdate).forEach(date => {
        // Create new workday
        workdays.push(new Workday({
            date: date,
            holiday: false
        }));
    });

    let resultJson = [];
    workdays[0].save().then(workday => {
        resultJson.push(workday);
        workdays[1].save().then(workday => {
            resultJson.push(workday);
            workdays[2].save().then(workday => {
                resultJson.push(workday);
                workdays[3].save().then(workday => {
                    resultJson.push(workday);
                    workdays[4].save().then(workday => {
                        resultJson.push(workday);
                        workdays[5].save().then(workday => {
                            resultJson.push(workday);
                            workdays[6].save().then(workday => {
                                resultJson.push(workday);
                                res.json(resultJson);
                            });
                        });
                    });
                });
            });
        });
    });
});

/* DELETE workday */
router.delete("/id/:workdayId", auth, function (req, res, next) {
    // Check permissions
    if (!req.user.admin) return res.status(401).end();

    req.workday.remove(function (err) {
        if (err) return next(err);
        res.send(true);
    });
});

/* DELETE all workdays from one week */
router.delete("/week/:weekdate", auth, function (req, res, next) {
    // Check permissions
    if (!req.user.admin) return res.status(401).end();

    req.workdays.forEach(workday => workday.remove(function (err) { if (err) return next(err); }));
    res.send(true);
});

/* PATCH workday */
router.patch("/id/:workdayId", auth, function (req, res, next) {
    // Check permissions
    if (!req.user.admin) return res.status(401).end();

    let workday = req.workday;
    workday.notes = req.body.notes;
    if (req.body.dayActivities)
        workday.dayActivities = req.body.dayActivities;
    if (req.body.daycareMentors)
        workday.daycareMentors = req.body.daycareMentors;
    if (req.body.morningBusses)
        workday.morningBusses = req.body.morningBusses;
    if (req.body.amActivities)
        workday.amActivities = req.body.amActivities;
    if (req.body.lunch)
        workday.lunch = req.body.lunch;
    if (req.body.pmActivities)
        workday.pmActivities = req.body.pmActivities;
    if (workday.holiday !== req.body.holiday)
        workday.holiday = req.body.holiday;
    workday.save(function (err, workday) {
        if (err) return next(err);
        res.json(workday);
    });
});

/* GET comments */
router.get("/id/:workdayId/comments", auth, function (req, res, next) {
    // Check permissions
    if (!req.user.admin) return res.status(401).end();

    res.json(req.workday.comments);
});

/* GET comment by id */
router.param("commentId", function (req, res, next, id) {
    for (let comment of req.workday.comments) {
        if (comment._id.toString() === id)
            req.comment = comment; return next();
    }
    return next(new Error("No comment found with id: " + id));
});
router.get("/id/:workdayId/comments/:commentId", auth, function (req, res, next) {
    // Check permissions
    if (!req.user.admin) {
        if (req.user._id !== req.comment.client._id.toString()) return res.status(401).end();
    }

    res.json(req.comment);
});

/* POST comment */
router.post("/id/:workdayId/comments", auth, function (req, res, next) {
    let workday = req.workday;
    let comment = new Comment({
        comment: req.body.comment,
        client: req.user._id
    });
    workday.comments.push(comment);
    workday.save(function (err) {
        if (err) return next(err);
        res.json(comment);
    });
});

/* DELETE comment */
router.delete("/id/:workdayId/comments/:commentId", auth, function (req, res, next) {
    // Check permissions
    if (!req.user.admin)
        if (req.user._id !== req.comment.client._id.toString()) return res.status(401).end();

    req.workday.comments.pull(req.params.commentId);
    req.workday.save(function (err) {
        if (err) return next(err);
        res.send(true);
    });
});

/* PATCH comment */
router.patch("/id/:workdayId/comments/:commentId", auth, function (req, res, next) {
    // Check permissions
    if (!req.user.admin) {
        if (req.user._id !== req.comment.client._id.toString()) return res.status(401).end();
    }

    req.workday.comments.pull(req.params.commentId);

    let comment = req.comment;
    if (req.body.comment)
        comment.comment = req.body.comment;

    req.workday.comments.push(comment);

    req.workday.save(function (err) {
        if (err) return next(err);
        res.json(comment);
    });
});

// Populate query
function populateWorkdays(query) {
    query
        .populate({ path: "dayActivities", populate: ['activity', { path: 'mentors', select: '-salt -hash' }, { path: 'clients', select: '-salt -hash' }] })
        .populate({ path: "daycareMentors", select: '-salt -hash' })
        .populate({ path: "morningBusses", populate: ['bus', { path: 'mentors', select: '-salt -hash' }, { path: 'clients', select: '-salt -hash' }] })
        .populate({ path: "amActivities", populate: ['activity', { path: 'mentors', select: '-salt -hash' }, { path: 'clients', select: '-salt -hash' }] })
        .populate({ path: "lunch", populate: [{ path: 'mentors', select: '-salt -hash' }, { path: 'clients', select: '-salt -hash' }] })
        .populate({ path: "pmActivities", populate: ['activity', { path: 'mentors', select: '-salt -hash' }, { path: 'clients', select: '-salt -hash' }] })
        .populate({ path: "eveningBusses", populate: ['bus', { path: 'mentors', select: '-salt -hash' }, { path: 'clients', select: '-salt -hash' }] })
        .populate({ path: "comments.client", select: '-salt -hash' });
}

// Check if date is correctly formatted
function checkDateFormat(dateString) {
    let dateRegex = /^(?:(?:31(_)(?:0?[13578]|1[02]))\1|(?:(?:29|30)(_)(?:0?[13-9]|1[0-2])\2))(?:(?:1[6-9]|[2-9]\d)?\d{2})$|^(?:29(_)0?2\3(?:(?:(?:1[6-9]|[2-9]\d)?(?:0[48]|[2468][048]|[13579][26])|(?:(?:16|[2468][048]|[3579][26])00))))$|^(?:0?[1-9]|1\d|2[0-8])(_)(?:(?:0?[1-9])|(?:1[0-2]))\4(?:(?:1[6-9]|[2-9]\d)?\d{2})$/gm;
    return dateString.match(dateRegex);
}

// Get week from dateString
function getWeek(dateString) {
    // Add days to date, creates copy
    function addDays(date, days) {
        const copy = new Date(Number(date));
        copy.setDate(date.getDate() + days);
        return copy;
    }
    // Subtract days from date, creates copy
    function subtractDays(date, days) {
        const copy = new Date(Number(date));
        copy.setDate(date.getDate() - days);
        return copy;
    }

    // Create new date
    let givenDate = new Date(dateString.split("_")[2]+"-"+dateString.split("_")[1]+"-"+dateString.split("_")[0]);
    // Find weekdays based on date
    let mondayDate = subtractDays(givenDate, (givenDate.getDay() - 1));
    let tuesdayDate = addDays(mondayDate, 1);
    let wednesdayDate = addDays(tuesdayDate, 1);
    let thursdayDate = addDays(wednesdayDate, 1);
    let fridayDate = addDays(thursdayDate, 1);
    let saturdayDate = addDays(fridayDate, 1);
    let sundayDate = addDays(saturdayDate, 1);

    return [mondayDate, tuesdayDate, wednesdayDate, thursdayDate, fridayDate, saturdayDate, sundayDate];
}

// Creates a workday for one client
function createClientWorkdayByWorkday(workday, userId) {
    let clientWorkday = new Workday();
    let isEmpty = true;

    // Add id
    clientWorkday._id = workday._id;
    // Add date
    clientWorkday.date = workday.date;
    if (workday.date.getDay() === 0 || workday.date.getDay() === 6) {
        isEmpty = false;
    }
    // Add dayActivity
    workday.dayActivities.forEach(dayActivity =>
        dayActivity.clients.forEach(client => {
            if (client._id.toString() === userId) {
                clientWorkday.dayActivities.push(dayActivity);
                isEmpty = false;
            }
        })
    );
    // Add morningBus
    workday.morningBusses.forEach(morningBus =>
        morningBus.clients.forEach(client => {
            if (client._id.toString() === userId) {
                clientWorkday.morningBusses.push(morningBus);
                isEmpty = false;
            }
        })
    );
    // Add amActivity
    workday.amActivities.forEach(amActivity =>
        amActivity.clients.forEach(client => {
            if (client._id.toString() === userId) {
                clientWorkday.amActivities.push(amActivity);
                isEmpty = false;
            }
        })
    );
    // Add lunch
    if (workday.lunch)
        workday.lunch.clients.forEach(client => {
            if (client._id.toString() === userId) {
                clientWorkday.lunch = workday.lunch;
                isEmpty = false;
            }
        });
    // Add pmActivity
    workday.pmActivities.forEach(pmActivity =>
        pmActivity.clients.forEach(client => {
            if (client._id.toString() === userId) {
                clientWorkday.pmActivities.push(pmActivity);
                isEmpty = false;
            }
        })
    );
    // Add eveningBus
    workday.eveningBusses.forEach(eveningBus =>
        eveningBus.clients.forEach(client => {
            if (client._id.toString() === userId) {
                clientWorkday.eveningBusses.push(eveningBus);
                isEmpty = false;
            }
        })
    );
    // Add holiday
    clientWorkday.holiday = workday.holiday;
    workday.holiday ? isEmpty = false : null;
    // Add comment
    for (let comment of workday.comments) {
        if (comment.client._id.toString() === userId)
            clientWorkday.comments.push(comment); break;
    }

    if (isEmpty)
        return;

    return clientWorkday;
}

module.exports = router;
