const express = require('express');
const Profile = require('../model/Profile');
const router = express.Router();
const mongoose = require('mongoose');

router.post('/profile', async (req, res) => {
    const { name, email, weight, height, targetCalories, dietType, activityLevel, healthGoals, allergies } = req.body;

    if (!email) {
        return res.status(400).json({ message: "Missing required fields: auth0Id and email" });
    }

    try {
        const profile = await Profile.findOneAndUpdate(
            { email }, // Find by unique email
            { name, email, weight, height, targetCalories, dietType, activityLevel, healthGoals, allergies },
            { new: true, upsert: true } // Create if not exists
        );

        res.status(200).json(profile);
    } catch (error) {
        res.status(500).json({ message: "Error storing profile", error });
    }
});
router.get('/profile/:userid', async (req, res) => {
    try {
        console.log(req.params.userid)
        userid = req.params.userid.replace(/^"|"$/g, '');

        const profile = await Profile.findById(userid);
        console.log(profile)
        if (!profile) return res.status(404).json({ message: 'Profile not found' });

        res.status(200).json(profile);
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ message: 'Error fetching profile', error });
    }
});


router.put('/updateprofile', async (req, res) => {
    const { userid, name, weight, height, targetCalories, dietType, activityLevel, healthGoals, allergies } = req.body;

    if (!userid) {
        return res.status(400).json({ message: "Missing required fields: userid" });
    }
    objectid = userid.replace(/^"|"$/g, '');

    try {
        const profile = await Profile.findByIdAndUpdate(
            objectid, // ✅ `userid` is now a valid ObjectId
            { name, weight, height, targetCalories, dietType, activityLevel, healthGoals, allergies },
            { new: true, upsert: true }
        );

        if (!profile) {
            return res.status(404).json({ message: "Profile not found" });
        }

        res.status(200).json(profile);
    } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).json({ message: "Error updating profile", error });
    }
});
module.exports = router;
