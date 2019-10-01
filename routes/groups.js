var express = require('express');
var router = express.Router();
let mongoose = require('mongoose');
let Group = mongoose.model("Group");
let jwt = require('express-jwt');

let auth = jwt({ secret: process.env.KOLV02_BACKEND_SECRET });

/* GET groups */
router.get('/', function(req, res, next) {
    let query = Group.find()
        .populate("user");
    query.exec(function(err, groups) {
        if (err) return next(err);
        res.json(groups);
    });
});

/* GET group by id */
router.param("groupId", function (req, res, next, id) {
    let query = Group.findById(id)
        .populate("user");
    query.exec(function (err, group) {
        if (err) return next(err);
        if (!group) return next(new Error("not found " + id));
        req.group = group;
        return next();
    });
});
router.get("/:groupId", function (req, res, next) {
    res.json(req.group);
});

/* POST group */
router.post("/", auth, function (req, res, next) {
    let group = new Group({
        name: req.body.name,
        icon: req.body.icon
    });
    group.save(function (err, group) {
        if (err) return next(err);
        res.json(group);
    });
});

/* DELETE group */
router.delete("/:groupId", auth, function (req, res, next) {
    req.group.remove(function (err) {
        if (err) return next(err);
        res.send(true);
    });
});

/* PATCH group */
router.patch("/:groupId", auth, function (req, res, next) {
    // TODO
    res.send("not yet implemented");
});

module.exports = router;