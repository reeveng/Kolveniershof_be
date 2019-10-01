var express = require('express');
var router = express.Router();
let mongoose = require('mongoose');
let Activity = mongoose.model("Activity");
let ActivityUnit = mongoose.model("ActivityUnit");
let jwt = require('express-jwt');

let auth = jwt({ secret: process.env.KOLV02_BACKEND_SECRET });

/* GET activities */
router.get('/', function(req, res, next) {
    let query = Activity.find();
    query.exec(function(err, activities) {
        if (err) return next(err);
        res.json(activities);
    });
});

/* GET activity by id */
router.param("activityId", function (req, res, next, id) {
    let query = Activity.findById(id);
    query.exec(function (err, activity) {
        if (err) return next(err);
        if (!activity) return next(new Error("not found " + id));
        req.activity = activity;
        return next();
    });
});
router.get("/:activityId", function (req, res, next) {
    res.json(req.activity);
});

/* POST activity */
router.post("/", auth, function (req, res, next) {
    let activity = new Activity({
        name: req.body.name,
        icon: req.body.icon
    });
    activity.save(function (err, activity) {
        if (err) return next(err);
        res.json(activity);
    });
});

/* DELETE activity */
router.delete("/:activityId", auth, function (req, res, next) {
    req.activity.remove(function (err) {
        if (err) return next(err);
        res.send(true);
    });
});

/* PATCH activity */
router.patch("/:activityId", auth, function (req, res, next) {
    // TODO
    res.send("not yet implemented");
});

/* GET activityUnits */
router.get("/units/", function(req, res, next) {
    let query = ActivityUnit.find();
    query.exec(function(err, activityUnits) {
        if (err) return next(err);
        res.json(activityUnits);
    });
});

/* GET activityUnit by id */
router.param("activityUnitId", function (req, res, next, id) {
    let query = ActivityUnit.findById(id);
    query.exec(function (err, activityUnit) {
        if (err) return next(err);
        if (!activityUnit) return next(new Error("not found " + id));
        req.activityUnit = activityUnit;
        return next();
    });
});
router.get("/units/:activityUnitId", function (req, res, next) {
    res.json(req.activityUnit);
});

/* POST activityUnit */
router.post("/units/", auth, function (req, res, next) {
    let activityUnit = new ActivityUnit({
        activity: req.body.activity,
        mentors: req.body.mentors,
        clients: req.body.clients
    });
    activityUnit.save(function (err, activityUnit) {
        if (err) return next(err);
        res.json(activityUnit);
    });
});

/* DELETE activityUnit */
router.delete("/units/:activityUnitId", auth, function (req, res, next) {
    req.activityUnit.remove(function (err) {
        if (err) return next(err);
        res.send(true);
    });
});

/* PATCH activityUnit */
router.patch("/units/:activityUnitId", auth, function (req, res, next) {
    // TODO
    res.send("not yet implemented");
});

module.exports = router;