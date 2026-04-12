import { useState } from "react";

const JIRA_BASE = "https://tabtale.atlassian.net/browse/";
const CLOUD_ID = "e12af754-9c9b-433f-9c88-41117d73202d";
const MCP_URL = "https://mcp.atlassian.com/v1/mcp";

const SC = {
  "Done": { bg: "#ecfdf5", text: "#065f46", dot: "#10b981", bdr: "#a7f3d0" },
  "In QA": { bg: "#eef2ff", text: "#3730a3", dot: "#6366f1", bdr: "#c7d2fe" },
  "Pending QA": { bg: "#eef2ff", text: "#3730a3", dot: "#6366f1", bdr: "#c7d2fe" },
  "Code Review": { bg: "#faf5ff", text: "#6b21a8", dot: "#a855f7", bdr: "#e9d5ff" },
  "Ready For Review": { bg: "#faf5ff", text: "#6b21a8", dot: "#a855f7", bdr: "#e9d5ff" },
  "in DEV": { bg: "#eff6ff", text: "#1e40af", dot: "#3b82f6", bdr: "#bfdbfe" },
  "In Progress": { bg: "#eff6ff", text: "#1e40af", dot: "#3b82f6", bdr: "#bfdbfe" },
  "In progress": { bg: "#eff6ff", text: "#1e40af", dot: "#3b82f6", bdr: "#bfdbfe" },
  "pending deployment": { bg: "#ecfdf5", text: "#065f46", dot: "#10b981", bdr: "#a7f3d0" },
  "Ready For Dev": { bg: "#f5f5f4", text: "#44403c", dot: "#78716c", bdr: "#d6d3d1" },
  "TO DO": { bg: "#f5f5f4", text: "#44403c", dot: "#78716c", bdr: "#d6d3d1" },
  "To Do": { bg: "#f5f5f4", text: "#44403c", dot: "#78716c", bdr: "#d6d3d1" },
  "BACKLOG": { bg: "#f5f5f4", text: "#44403c", dot: "#78716c", bdr: "#d6d3d1" },
  "BLOCKED": { bg: "#fef2f2", text: "#991b1b", dot: "#ef4444", bdr: "#fecaca" },
};
const PI = { Blocker:"\u{1F534}", Critical:"\u{1F7E0}", Major:"\u{1F7E1}", Medium:"\u{1F7E2}", Minor:"\u{1F535}", Trivial:"\u26AA" };
const PC = {
  GGS: { bg: "#f0fdfa", text: "#115e59", bdr: "#14b8a6", acc: "#0d9488" },
  CLPLG: { bg: "#f5f3ff", text: "#5b21b6", bdr: "#8b5cf6", acc: "#7c3aed" },
  SST2: { bg: "#fdf2f8", text: "#9d174d", bdr: "#ec4899", acc: "#db2777" },
};
const SO = ["BLOCKED","In progress","in DEV","Code Review","In QA","pending deployment","In Progress","Ready For Dev","TO DO","To Do","BACKLOG","Done"];
const PL = { GGS:"Server", CLPLG:"Plugin", SST2:"Game" };
const gs = s => SC[s] || { bg:"#f3f4f6", text:"#374151", dot:"#9ca3af", bdr:"#d1d5db" };
const gp = k => PC[k.split("-")[0]] || { bg:"#f3f4f6", text:"#374151", bdr:"#6b7280", acc:"#6b7280" };

// Grouped statuses
const SG = {
  "TODO":["To Do","TO DO","BACKLOG","Ready For Dev"],
  "IN DEV":["in DEV","In Progress","In progress","Code Review","Ready For Review"],
  "IN QA":["In QA","Pending QA"],
  "BLOCKED":["BLOCKED"],
  "DONE":["Done","pending deployment"],
};
const SG_ORDER = ["BLOCKED","IN DEV","IN QA","TODO","DONE"];
const SG_STYLE = {
  "TODO":{bg:"#f5f5f4",text:"#44403c",dot:"#78716c",bdr:"#d6d3d1"},
  "IN DEV":{bg:"#eff6ff",text:"#1e40af",dot:"#3b82f6",bdr:"#bfdbfe"},
  "IN QA":{bg:"#eef2ff",text:"#3730a3",dot:"#6366f1",bdr:"#c7d2fe"},
  "BLOCKED":{bg:"#fef2f2",text:"#991b1b",dot:"#ef4444",bdr:"#fecaca"},
  "DONE":{bg:"#ecfdf5",text:"#065f46",dot:"#10b981",bdr:"#a7f3d0"},
};
const getGroup = s => {for(const[g,arr]of Object.entries(SG)){if(arr.includes(s))return g}return "TODO"};

const D = {
  GGS: [
    {k:"GGS-184",t:"Task",s:"Pending QA",p:"Major",a:"Vladyslav Lazurenko",m:"Deploy Runway to SCM Staging+Prod",l:[]},
    {k:"GGS-188",t:"Task",s:"Pending QA",p:"Major",a:"Max Melnychuk",m:"Add staging resources for Runaway",l:[]},
    {k:"GGS-191",t:"Bug",s:"Done",p:"Major",a:"Unassigned",m:"Compute score goal based on the number of outfits",l:[{t:"action item from",k:"SST2-17200"}]},
    {k:"GGS-194",t:"Bug",s:"In QA",p:"Major",a:"Vladyslav Lazurenko",m:"FoF are not limited by level",l:[{t:"action item from",k:"SST2-17371"}]},
    {k:"GGS-193",t:"Bug",s:"In QA",p:"Major",a:"Vladyslav Lazurenko",m:"Remove Player from runway upon leave",l:[{t:"has action item",k:"SST2-17302"}]},
    {k:"GGS-190",t:"Task",s:"In QA",p:"Blocker",a:"Vladyslav Lazurenko",m:"Bots should only join if we have at least minRealPlayers in the room",l:[{t:"relates to",k:"SST2-17014"},{t:"has action item",k:"SST2-17311"}]},
    {k:"GGS-192",t:"Bug",s:"In QA",p:"Blocker",a:"Vladyslav Lazurenko",m:"Bot fails to submit outfit",l:[{t:"relates to",k:"SST2-17232"}]},
    {k:"GGS-151",t:"Story",s:"In QA",p:"Major",a:"Vladyslav Lazurenko",m:"Gifting: player can receive MAX gifts per day",l:[]},
    {k:"GGS-159",t:"Story",s:"In QA",p:"Major",a:"Vladyslav Lazurenko",m:"Friends of Friends - Updated",l:[{t:"relates to",k:"CLPLG-56"}]},
    {k:"GGS-179",t:"Story",s:"In QA",p:"Major",a:"Max Melnychuk",m:"Runway Authentication",l:[{t:"action item from",k:"CLPLG-83"}]},
    {k:"GGS-174",t:"Story",s:"In QA",p:"Major",a:"Max Melnychuk",m:"Terminate runway if not enough players ready",l:[{t:"action item from",k:"SST2-17134"}]},
    {k:"GGS-167",t:"Story",s:"In QA",p:"Major",a:"Max Melnychuk",m:"Bots timing during matchmaking",l:[]},
    {k:"GGS-175",t:"Story",s:"In QA",p:"Major",a:"Max Melnychuk",m:"Bonus Score",l:[{t:"action item from",k:"SST2-17136"},{t:"has action item",k:"CLPLG-82"}]},
    {k:"GGS-183",t:"Bug",s:"In QA",p:"Major",a:"Vladyslav Lazurenko",m:"SCM bots have Glow Avatars",l:[]},
    {k:"GGS-186",t:"Task",s:"In QA",p:"Major",a:"Vladyslav Lazurenko",m:"Update glow match config 7/3/1",l:[]},
    {k:"GGS-158",t:"Story",s:"In QA",p:"Major",a:"Vladyslav Lazurenko",m:"Suggested Friends: Players w/o Friends",l:[{t:"is blocked by",k:"CLPLG-67"}]},
    {k:"GGS-161",t:"Story",s:"In QA",p:"Major",a:"Vladyslav Lazurenko",m:"Reset gifting interval for QA",l:[]},
    {k:"GGS-170",t:"Story",s:"Ready For Dev",p:"Major",a:"Max Melnychuk",m:"Bots Behavior: Poses and Confetti",l:[{t:"action item from",k:"GGS-101"},{t:"action item from",k:"SST2-16797"}]},
    {k:"GGS-152",t:"Story",s:"Ready For Dev",p:"Major",a:"Unassigned",m:"Gifting: get server time",l:[{t:"relates to",k:"CLPLG-70"}]},
    {k:"GGS-163",t:"Bug",s:"Ready For Dev",p:"Critical",a:"Unassigned",m:"Player data restored not from the latest backup",l:[{t:"causes",k:"SST2-16369"}]},
    {k:"GGS-157",t:"Story",s:"Ready For Dev",p:"Major",a:"Unassigned",m:"Player Properties",l:[{t:"is blocked by",k:"CLPLG-67"}]},
    {k:"GGS-143",t:"Story",s:"Ready For Dev",p:"Major",a:"Max Melnychuk",m:"Deployments Tracking",l:[]},
    {k:"GGS-162",t:"Story",s:"Ready For Dev",p:"Major",a:"Unassigned",m:"Search by PlayerID",l:[]},
    {k:"GGS-150",t:"Story",s:"Ready For Dev",p:"Major",a:"Unassigned",m:"Gift Claimed",l:[]},
    {k:"GGS-149",t:"Story",s:"Ready For Dev",p:"Major",a:"Unassigned",m:"Gift Pending",l:[]},
    {k:"GGS-148",t:"Story",s:"Ready For Dev",p:"Major",a:"Unassigned",m:"Friend Invite Accepted",l:[]},
    {k:"GGS-147",t:"Story",s:"Ready For Dev",p:"Major",a:"Unassigned",m:"Friend Invite Pending",l:[]},
    {k:"GGS-146",t:"Story",s:"Ready For Dev",p:"Major",a:"Unassigned",m:"Client API for sending Push Notifications",l:[]},
    {k:"GGS-95",t:"Task",s:"Ready For Dev",p:"Major",a:"Max Melnychuk",m:"Delete protection for RDS & DynamoDB tables",l:[]},
    {k:"GGS-111",t:"Story",s:"Ready For Dev",p:"Major",a:"Unassigned",m:"Dashboard",l:[]},
    {k:"GGS-96",t:"Task",s:"Ready For Dev",p:"Major",a:"Unassigned",m:"Setup backups for DynamoDB tables",l:[]},
    {k:"GGS-101",t:"Story",s:"in DEV",p:"Major",a:"Max Melnychuk",m:"Runway Management Dashboard",l:[{t:"has action item",k:"SST2-17051"},{t:"has action item",k:"SST2-16611"},{t:"has action item",k:"SST2-16797"},{t:"has action item",k:"SST2-17016"},{t:"has action item",k:"GGS-170"},{t:"has action item",k:"SST2-17137"}]},
    {k:"GGS-139",t:"Story",s:"pending deployment",p:"Major",a:"Vladyslav Lazurenko",m:"Get Suggested Friends",l:[{t:"relates to",k:"CLPLG-56"}]},
    {k:"GGS-168",t:"Bug",s:"pending deployment",p:"Major",a:"Max Melnychuk",m:"Timing of submit outfit for Bots",l:[{t:"relates to",k:"CLPLG-76"}]},
    {k:"GGS-171",t:"Task",s:"pending deployment",p:"Major",a:"Max Melnychuk",m:"Add Bot Emote delay for 7 seconds",l:[{t:"action item from",k:"SST2-17137"}]},
    {k:"GGS-160",t:"Story",s:"pending deployment",p:"Major",a:"Max Melnychuk",m:"Bots Outfits",l:[{t:"relates to",k:"CLPLG-68"},{t:"has action item",k:"GGS-177"}]},
    {k:"GGS-141",t:"Story",s:"pending deployment",p:"Major",a:"Max Melnychuk",m:"Matchmaking Logic",l:[]},
    {k:"GGS-138",t:"Story",s:"pending deployment",p:"Major",a:"Max Melnychuk",m:"Matchmaking",l:[]},
    {k:"GGS-166",t:"Story",s:"pending deployment",p:"Major",a:"Max Melnychuk",m:"Assign name and avatar to bots",l:[]},
    {k:"GGS-169",t:"Bug",s:"pending deployment",p:"Major",a:"Max Melnychuk",m:"runawayGraceDurationSeconds should be 7 seconds",l:[]},
    {k:"GGS-155",t:"Story",s:"pending deployment",p:"Major",a:"Max Melnychuk",m:"Join API",l:[]},
    {k:"GGS-172",t:"Task",s:"pending deployment",p:"Major",a:"Max Melnychuk",m:"Add intermidiate score calculation for PlayerRunawayEnd event",l:[]},
    {k:"GGS-165",t:"Task",s:"pending deployment",p:"Major",a:"Max Melnychuk",m:"Add duration + expected end time for each phase",l:[]},
    {k:"GGS-135",t:"Story",s:"pending deployment",p:"Major",a:"Max Melnychuk",m:"Authentication for NATS",l:[]},
    {k:"GGS-164",t:"Task",s:"pending deployment",p:"Major",a:"Max Melnychuk",m:"Implement themeId + eventId basic setup",l:[]},
    {k:"GGS-102",t:"Story",s:"pending deployment",p:"Major",a:"Max Melnychuk",m:"Persist Scores",l:[]},
    {k:"GGS-156",t:"Story",s:"pending deployment",p:"Major",a:"Max Melnychuk",m:"If not enough outfits, terminate the event",l:[{t:"blocks",k:"CLPLG-77"}]},
    {k:"GGS-140",t:"Story",s:"pending deployment",p:"Major",a:"Vladyslav Lazurenko",m:"Gifting",l:[]},
    {k:"GGS-128",t:"Task",s:"pending deployment",p:"Major",a:"Vladyslav Lazurenko",m:"Broker load testing (NATS)",l:[]},
    {k:"GGS-180",t:"Story",s:"TO DO",p:"Major",a:"Unassigned",m:"Generate bot outfits",l:[]},
    {k:"GGS-182",t:"Story",s:"TO DO",p:"Major",a:"Unassigned",m:"Runway monitoring",l:[]},
    {k:"GGS-189",t:"Story",s:"TO DO",p:"Major",a:"Unassigned",m:"Notify players of the lowest app version participating in the runway",l:[{t:"action item from",k:"SST2-15331"}]},
    {k:"GGS-145",t:"Story",s:"TO DO",p:"Major",a:"Unassigned",m:"Store Firebase Push Token",l:[]},
    {k:"GGS-66",t:"Story",s:"TO DO",p:"Major",a:"Unassigned",m:"Force Update 2-steps commit",l:[{t:"relates to",k:"CLPLG-1"}]},
    {k:"GGS-136",t:"Story",s:"TO DO",p:"Major",a:"Unassigned",m:"Seamless Deploy / Rollback",l:[]},
    {k:"GGS-92",t:"Sub-task",s:"TO DO",p:"Major",a:"Max Melnychuk",m:"Create E2E test scenario for game match",l:[]},
    {k:"GGS-125",t:"Story",s:"TO DO",p:"Major",a:"Unassigned",m:"Build from AppsDB",l:[]},
    {k:"GGS-124",t:"Story",s:"TO DO",p:"Major",a:"Unassigned",m:"Show app configurations in Dashboard",l:[]},
    {k:"GGS-107",t:"Story",s:"TO DO",p:"Major",a:"Unassigned",m:"Implement Grafana Dashboard",l:[]},
    {k:"GGS-106",t:"Story",s:"TO DO",p:"Major",a:"Unassigned",m:"Share metrics from Cloudwatch to Grafana",l:[]},
    {k:"GGS-105",t:"Story",s:"TO DO",p:"Major",a:"Unassigned",m:"Login to Grafana from Dashboard",l:[]},
    {k:"GGS-97",t:"Task",s:"TO DO",p:"Major",a:"Unassigned",m:"Create AWS dashboard for save-data feature",l:[]},
    {k:"GGS-29",t:"Task",s:"TO DO",p:"Major",a:"Unassigned",m:"Reduce BE Dashboard API latency",l:[{t:"relates to",k:"GGS-42"}]},
    {k:"GGS-37",t:"Task",s:"TO DO",p:"Major",a:"Unassigned",m:"API Gateway setup throttle and rate-limit",l:[]},
    {k:"GGS-36",t:"Task",s:"TO DO",p:"Major",a:"Unassigned",m:"API Gateway API Key implementation + protect private route",l:[]}
  ],
  CLPLG: [
    {k:"CLPLG-84",t:"Bug",s:"To Do",p:"Major",a:"Xiaole Mu",m:"Player has left but still appears in the lobby",l:[{t:"action item from",k:"SST2-17302"}]},
    {k:"CLPLG-56",t:"Task",s:"To Do",p:"Major",a:"Laze Ristoski",m:"Suggested Friends",l:[{t:"relates to",k:"GGS-139"},{t:"relates to",k:"GGS-159"}]},
    {k:"CLPLG-76",t:"Bug",s:"To Do",p:"Major",a:"Unassigned",m:"Bots with no outfit",l:[{t:"relates to",k:"GGS-168"}]},
    {k:"CLPLG-82",t:"Task",s:"To Do",p:"Major",a:"Laze Ristoski",m:"Bonus Score",l:[{t:"action item from",k:"SST2-17136"},{t:"action item from",k:"GGS-175"}]},
    {k:"CLPLG-71",t:"Task",s:"To Do",p:"Major",a:"Laze Ristoski",m:"NATS DEBUG Event",l:[]},
    {k:"CLPLG-73",t:"Bug",s:"To Do",p:"Major",a:"Unassigned",m:"Failed to connect",l:[]},
    {k:"CLPLG-54",t:"Task",s:"To Do",p:"Major",a:"Laze Ristoski",m:"Matchmaking",l:[]},
    {k:"CLPLG-72",t:"Task",s:"To Do",p:"Major",a:"Laze Ristoski",m:"Persist Scores",l:[]},
    {k:"CLPLG-53",t:"Task",s:"To Do",p:"Major",a:"Uri Danan",m:"Restore Progress ID",l:[]},
    {k:"CLPLG-49",t:"Task",s:"To Do",p:"Major",a:"Unassigned",m:"Split GameServices config from CLIK's",l:[]},
    {k:"CLPLG-46",t:"Task",s:"To Do",p:"Major",a:"Uri Danan",m:"Restore CLIK User Properties from backup",l:[]},
    {k:"CLPLG-40",t:"Bug",s:"To Do",p:"Major",a:"Laze Ristoski",m:"Error Screen for New Users in GPGS login and creating account",l:[]},
    {k:"CLPLG-39",t:"Task",s:"To Do",p:"Major",a:"Laze Ristoski",m:"Local notification crash on ASMR Slicing",l:[]},
    {k:"CLPLG-17",t:"Task",s:"To Do",p:"Major",a:"Unassigned",m:"implement in Ladybug",l:[]},
    {k:"CLPLG-7",t:"Task",s:"To Do",p:"Major",a:"Laze Ristoski",m:"Create UPM for non Authentication Plugins (ForceUpdate, Coupons and Toggle)",l:[]},
    {k:"CLPLG-22",t:"Task",s:"To Do",p:"Major",a:"Unassigned",m:"Create UPM for Authentication Plugins (Authentication, PVP, Save data)",l:[]},
    {k:"CLPLG-21",t:"Subtask",s:"To Do",p:"Major",a:"Unassigned",m:"GP",l:[]},
    {k:"CLPLG-20",t:"Subtask",s:"To Do",p:"Major",a:"Unassigned",m:"iOS",l:[]},
    {k:"CLPLG-41",t:"Task",s:"In QA",p:"Major",a:"Unassigned",m:"Player Profile",l:[{t:"relates to",k:"GGS-103"}]},
    {k:"CLPLG-70",t:"Task",s:"In QA",p:"Major",a:"Unassigned",m:"get server time",l:[{t:"relates to",k:"GGS-152"}]},
    {k:"CLPLG-83",t:"Task",s:"In QA",p:"Major",a:"Laze Ristoski",m:"Runway Authentication",l:[{t:"has action item",k:"GGS-179"}]},
    {k:"CLPLG-79",t:"Task",s:"In QA",p:"Major",a:"Laze Ristoski",m:"Analytics Events",l:[]},
    {k:"CLPLG-80",t:"Task",s:"In QA",p:"Major",a:"Laze Ristoski",m:"Leave runway if player fails to submit model",l:[{t:"action item from",k:"SST2-17134"}]},
    {k:"CLPLG-81",t:"Task",s:"In QA",p:"Major",a:"Laze Ristoski",m:"Status of earlier joiners is incorrect",l:[{t:"action item from",k:"SST2-17133"}]},
    {k:"CLPLG-74",t:"Bug",s:"In QA",p:"Major",a:"Unassigned",m:"Players missing during matchmaking",l:[]},
    {k:"CLPLG-61",t:"Task",s:"In QA",p:"Major",a:"Laze Ristoski",m:"Join API Parameters",l:[]},
    {k:"CLPLG-68",t:"Task",s:"In QA",p:"Major",a:"Laze Ristoski",m:"Bots Outfits",l:[{t:"relates to",k:"GGS-160"}]},
    {k:"CLPLG-78",t:"Task",s:"In QA",p:"Major",a:"Laze Ristoski",m:"Toggle Runway via CLOK",l:[]},
    {k:"CLPLG-75",t:"Task",s:"In QA",p:"Major",a:"Unassigned",m:"Notify the game when players submit outfits",l:[]},
    {k:"CLPLG-50",t:"Task",s:"In QA",p:"Major",a:"Unassigned",m:"Connected Friends",l:[]},
    {k:"CLPLG-67",t:"Task",s:"In QA",p:"Major",a:"Laze Ristoski",m:"Add properties to Player Profile",l:[{t:"blocks",k:"GGS-157"},{t:"blocks",k:"GGS-158"}]},
    {k:"CLPLG-77",t:"Task",s:"In QA",p:"Major",a:"Laze Ristoski",m:"Terminate event when not enough players",l:[{t:"is blocked by",k:"GGS-156"}]},
    {k:"CLPLG-63",t:"Task",s:"In QA",p:"Major",a:"Laze Ristoski",m:"Notify other players when a player leaves the room",l:[]},
    {k:"CLPLG-62",t:"Task",s:"In QA",p:"Major",a:"Laze Ristoski",m:"Share theme in onPhaseCompleted event ",l:[]},
    {k:"CLPLG-51",t:"Task",s:"In QA",p:"Major",a:"Unassigned",m:"Friend Requests Notifications",l:[]},
    {k:"CLPLG-44",t:"Task",s:"In QA",p:"Major",a:"Unassigned",m:"Friends Management",l:[]},
    {k:"CLPLG-57",t:"Task",s:"In QA",p:"Major",a:"Laze Ristoski",m:"Gifting",l:[]},
    {k:"CLPLG-59",t:"Task",s:"In QA",p:"Major",a:"Laze Ristoski",m:"Server address should be read from config file",l:[]},
    {k:"CLPLG-64",t:"Bug",s:"In QA",p:"Major",a:"Laze Ristoski",m:"Runway freezes in editor",l:[]},
    {k:"CLPLG-65",t:"Task",s:"In QA",p:"Major",a:"Laze Ristoski",m:"Replace AvatarId with AvatarURL",l:[]},
    {k:"CLPLG-66",t:"Task",s:"In QA",p:"Major",a:"Laze Ristoski",m:"Terminate event early",l:[]},
    {k:"CLPLG-69",t:"Task",s:"In QA",p:"Major",a:"Laze Ristoski",m:"Add accepted notification to player",l:[]},
    {k:"CLPLG-60",t:"Task",s:"In QA",p:"Major",a:"Laze Ristoski",m:"Runway APIs should report errors to the game",l:[]},
    {k:"CLPLG-55",t:"Bug",s:"In QA",p:"Major",a:"Laze Ristoski",m:"Friend's profile is not updating promptly.",l:[]},
    {k:"CLPLG-27",t:"Task",s:"In QA",p:"Major",a:"Laze Ristoski",m:"Add GetData to be implemented all plugind",l:[]}
  ],
  SST2: [
    {k:"SST2-17200",t:"Bug",s:"In QA",p:"Critical",a:"Xinshao Zhang",m:"[Runway] Scores should match the players in the round",l:[{t:"clones",k:"SST2-17194"},{t:"has action item",k:"GGS-191"},{t:"action item from",k:"SST2-17232"}]},
    {k:"SST2-16369",t:"Task",s:"BACKLOG",p:"Major",a:"Kehui Wei",m:"Users to check - Progress loss (iOS)",l:[{t:"is caused by",k:"GGS-163"}]},
    {k:"SST2-17373",t:"Bug",s:"BLOCKED",p:"Major",a:"Michael Lv",m:"[SuggestedFriends] This feature currently only displays Friends who meet the Level Requirement and does not show Friends related to Location & Language settings for Glow & Online status requirements.",l:[]},
    {k:"SST2-15331",t:"Task",s:"BLOCKED",p:"Major",a:"Uri Danan",m:"[Runway] Server solution for cross-version multiplayer sessions (Friends invites compatibility)",l:[{t:"has action item",k:"GGS-189"},{t:"resolves",k:"SST2-17306"}]},
    {k:"SST2-16611",t:"Bug",s:"BLOCKED",p:"Blocker",a:"Michael Lv",m:"[Server bug] Server Refresh timer for gifting should be EST 00:00:00, now it is UTC 00:00:00",l:[{t:"action item from",k:"GGS-101"}]},
    {k:"SST2-17137",t:"Task",s:"BLOCKED",p:"Blocker",a:"Michael Lv",m:"[Runway] The bot's Pose & Emote & Confetti send timer is wrong,Randomization should begin 7 seconds after the PLAYER_RUNAWAY_START event and last for 8 seconds",l:[{t:"has action item",k:"GGS-171"},{t:"action item from",k:"GGS-101"}]},
    {k:"SST2-17306",t:"Task",s:"BLOCKED",p:"Blocker",a:"Michael Lv",m:"[Server] All players matched within the same bucket must in the same version number",l:[{t:"is resolved by",k:"SST2-15331"}]},
    {k:"SST2-11543",t:"Task",s:"BLOCKED",p:"Major",a:"Bisera Kotevska",m:"⚠️❗️❗️❗️[forceUpdate] - monitor and analysis for the live users firebase events",l:[]},
    {k:"SST2-17302",t:"Bug",s:"Ready For Review",p:"Major",a:"Xinshao Zhang",m:"[Runway] Player enter same runway event agian, leaved other player still in this runway(it's wrong)",l:[{t:"action item from",k:"GGS-193"},{t:"has action item",k:"CLPLG-84"}]},
    {k:"SST2-17051",t:"Task",s:"Ready For Review",p:"Blocker",a:"Michael Lv",m:"[Runway] Two players enter different Runway event , but they can be matched with each other(it's wrong)",l:[{t:"action item from",k:"GGS-101"}]},
    {k:"SST2-17016",t:"Task",s:"Ready For Review",p:"Blocker",a:"Michael Lv",m:"[Server] Send a random theme to the specific event through server side based on the config",l:[{t:"action item from",k:"GGS-101"}]},
    {k:"SST2-16502",t:"Task",s:"Ready For Review",p:"Major",a:"Valerija Zlateva",m:"[Runway] Runway analytic events (client &plugin)",l:[{t:"causes",k:"SST2-17206"}]},
    {k:"SST2-17132",t:"Task",s:"Ready For Review",p:"Blocker",a:"Xinshao Zhang",m:"[Runway] Matchmaking status, Joined Bot miss profile icon",l:[{t:"has action item",k:"GGS-176"}]},
    {k:"SST2-17311",t:"Bug",s:"In progress",p:"Minor",a:"Uri Danan",m:"[Runway] Matchmaking screen, player see 4 bot joined but show not enough player found when max waiting timer =0(it's strange )",l:[{t:"action item from",k:"GGS-190"}]}
  ],
};
// Normalize data (exclude Epics)
const norm = arr => arr.filter(i => i.t !== "Epic").map(i => ({key:i.k, type:i.t, status:i.s, priority:i.p, assignee:i.a, summary:i.m, links:i.l.map(x=>({type:x.t,key:x.k}))}));
const initData = { GGS: norm(D.GGS), CLPLG: norm(D.CLPLG), SST2: norm(D.SST2) };

const initSlack = {
  ts: "2026-03-15T12:00:00Z",
  channels: [
    {id:"C08FDAPECKE",name:"glow-server",active:true},
    {id:"C0972DJ5BMY",name:"glow-runway",active:false},
    {id:"C08HU8AR3T8",name:"glow-game-server-devlopers",active:true},
    {id:"C09S3QH0ZQA",name:"glow-social",active:true},
    {id:"C08GZ7W5BV4",name:"glow-client-server",active:false},
    {id:"C09GVKW6HH6",name:"glow-runway-client-server",active:false},
  ],
  items: [
    {ch:"glow-server",sev:"critical",title:"Glow QA server down — NATS connection failure since Mar 12",desc:"RM Node server can't connect to NATS, server won't start. Caused by Marko's PR adding new metrics. Vladyslav rolling back. QA blocked again.",who:"Vladyslav Lazurenko",jira:null,owner:"Vladyslav Lazurenko",action:"Rollback Marko's NATS metrics PR, restore Glow QA",done:true,resolution:"Vladyslav rolled back, Glow QA server restored"},
    {ch:"glow-server",sev:"high",title:"SCM PROD 401 auth error with Google account login",desc:"Xiaole reports consistent 401 error authenticating with Google account on SCM PROD. Suspected mismatch between GPGS auth config and client.",who:"Xiaole Mu",jira:null,owner:"Vladyslav Lazurenko",action:"Check GPGS authentication config on SCM PROD server",done:false,resolution:null},
    {ch:"glow-server",sev:"medium",title:"Runway dashboard config — placeholder data needs replacement",desc:"Uri clarified that events/themes config in dashboard are just placeholders from Max. Actual config files from Xiaole need to be uploaded.",who:"Uri Danan",jira:null,owner:"Uri Danan / Max",action:"Upload actual events and themes config to runway dashboard",done:false,resolution:null},
    {ch:"glow-game-server-devlopers",sev:"high",title:"EKS cluster deploy failures blocking Glow QA runway",desc:"Max reports EKS cluster failures preventing redeployment. Matchmaking also fails due to empty events DB — can't upload JSON until redeploy works.",who:"Max Melnychuk",jira:null,owner:"Max / Marko Doda",action:"Fix EKS cluster deploy, then upload events JSON",done:true,resolution:"Vladyslav rolled back problematic PR, cluster restored"},
    {ch:"glow-game-server-devlopers",sev:"medium",title:"Route 53 record missing for glow-rm-qa.ttpsdk.info",desc:"Itai noticed rm_backend_host in Glow QA dashboard points to glow-rm-qa.ttpsdk.info but no Route 53 record exists for it.",who:"Itai Levi",jira:null,owner:"Max / Vladyslav",action:"Create Route 53 record for glow-rm-qa.ttpsdk.info",done:false,resolution:null},
    {ch:"glow-game-server-devlopers",sev:"info",title:"SCM QA updated with suggested friends v2 — better perf, removed level filter in FoF",desc:"Vladyslav deployed improved suggested friends v2 to SCM QA with better performance and removed level filter in Friends of Friends.",who:"Vladyslav Lazurenko",jira:"GGS-194",owner:null,action:null,done:true,resolution:"Deployed to SCM QA"},
    {ch:"glow-social",sev:"high",title:"QA delayed — server & NATS issues blocked testing most of day",desc:"Xinshao reports Runway cycle 2 at 90%, Save State at 12%. Server/NATS outage blocked testing. Bot join timer still broken (SST2-17311). Can't get theme from DB config.",who:"Xinshao Zhang",jira:"SST2-17311",owner:"Server team",action:"Fix bot joined timer + theme DB config for QA",done:false,resolution:null},
    {ch:"glow-social",sev:"high",title:"Anna Zhang pushing for Glow QA environment today for Monday testing",desc:"Anna needs Glow QA ready ASAP so China team can start full testing Monday morning. Uri confirmed team is on it.",who:"Anna Zhang",jira:null,owner:"Uri Danan",action:"Get Glow QA environment fully working before Monday",done:false,resolution:null},
    {ch:"glow-social",sev:"medium",title:"Push notification GDD shared — plugin target April 8",desc:"Remote push scheduled for S56 tech (starts April 20). Plugin expected ready for SCM on April 8. Must be ready for Clubs.",who:"Eiyar Goldman",jira:null,owner:"Uri Danan",action:"Add push notification GDD to task list",done:false,resolution:null},
  ],
};

function SBadge({status}){const s=gs(status);return <span style={{background:s.bg,color:s.text,border:`1px solid ${s.bdr}`}} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap"><span style={{background:s.dot}} className="w-1.5 h-1.5 rounded-full inline-block"/>{status}</span>}
function PBadge({ik}){const s=gp(ik);return <span style={{background:s.bg,color:s.text,border:`1px solid ${s.bdr}44`}} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold">{PL[ik.split("-")[0]]||ik.split("-")[0]}</span>}
function LBadge({link,allIssues}){const s=gp(link.key);const linked=allIssues&&allIssues.find(i=>i.key===link.key);const ls=linked?gs(linked.status):null;return <a href={`${JIRA_BASE}${link.key}`} target="_blank" rel="noopener noreferrer" style={{background:s.bg,color:s.text,border:`1px solid ${s.bdr}44`}} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs hover:opacity-80 no-underline"><span className="opacity-50">{link.type}</span><span className="font-mono font-semibold">{link.key}</span>{ls&&<span style={{background:ls.bg,color:ls.text,border:`1px solid ${ls.bdr}`,borderRadius:10,padding:"0px 5px",fontSize:10,marginLeft:2}} title={linked.status}>{linked.status}</span>}</a>}

function Row({issue,isLinked,allIssues,onMirror,ncpTargets}){
  const proj=issue.key.split("-")[0];
  const show=issue.links.filter(x=>["GGS","CLPLG","SST2"].includes(x.key.split("-")[0]));
  return(
    <div className="group flex flex-col gap-2 px-4 py-3 hover:bg-gray-50 transition-colors" style={{borderLeft:isLinked?`3px solid ${gp(issue.key).acc}`:"3px solid transparent"}}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-sm">{PI[issue.priority]||"\u26AA"}</span>
          <a href={`${JIRA_BASE}${issue.key}`} target="_blank" rel="noopener noreferrer" className="font-mono text-xs font-bold no-underline shrink-0" style={{color:gp(issue.key).acc}}>{issue.key}</a>
          <PBadge ik={issue.key}/>
          <span className="text-sm text-gray-700 truncate">{issue.summary}</span>
        </div>
        <SBadge status={issue.status}/>
      </div>
      <div className="flex items-center gap-3 pl-6 text-xs">
        <span className="text-gray-400">{issue.assignee}</span>
        <span className="text-gray-300">{"\u2022"}</span>
        <span className="text-gray-400 capitalize">{issue.type}</span>
        {show.length>0&&<><span className="text-gray-300">{"\u2022"}</span><div className="flex items-center gap-1 flex-wrap">{show.map((x,i)=><LBadge key={i} link={x} allIssues={allIssues}/>)}</div></>}
        {ncpTargets&&ncpTargets.length>0&&<><span className="text-gray-300">{"\u2022"}</span><div className="flex items-center gap-1">{ncpTargets.map(m=><button key={m} onClick={()=>onMirror&&onMirror(issue,[m])} style={{background:PC[m].bg,color:PC[m].acc,border:`1px solid ${PC[m].bdr}44`,borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",lineHeight:"16px"}}>+ {PL[m]}</button>)}</div></>}
      </div>
    </div>
  );
}

function Modal({issue,targets,onClose}){
  const src=issue.key.split("-")[0];
  const srcL={GGS:"Game Server",CLPLG:"Plugin",SST2:"Game"}[src]||src;
  const [title,setTitle]=useState(`[${issue.key}] ${issue.summary}`);
  const [desc,setDesc]=useState(`Counterpart for ${issue.key} (${srcL}).\n\nOriginal: ${JIRA_BASE}${issue.key}\nSummary: ${issue.summary}\nStatus: ${issue.status}\nAssignee: ${issue.assignee}`);
  const [sel,setSel]=useState(targets[0]);
  const [busy,setBusy]=useState(false);
  const [res,setRes]=useState(null);

  const go=async()=>{
    setBusy(true);
    try{
      const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:`Use Atlassian MCP to create a Jira issue in project ${sel} on cloud ${CLOUD_ID}:\n- Summary: ${title}\n- Description: ${desc}\n- Type: Task\n- Priority: ${issue.priority}\nThen link it to ${issue.key} with "Relates" type.\nReturn the new issue key.`}],mcp_servers:[{type:"url",url:"https://mcp.atlassian.com/v1/mcp",name:"atlassian"}]})});
      const d=await r.json();
      const txt=d.content?.filter(b=>b.type==="text").map(b=>b.text).join("")||"";
      const m=txt.match(/(GGS|CLPLG|SST2)-\d+/);
      setRes({ok:true,key:m?m[0]:txt.trim().substring(0,30)});
    }catch(e){setRes({ok:false,err:e.message})}
    setBusy(false);
  };

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.3)",backdropFilter:"blur(4px)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
      <div style={{background:"#fff",borderRadius:16,width:560,maxHeight:"85vh",overflow:"auto",boxShadow:"0 24px 48px rgba(0,0,0,0.15)"}} className="p-6" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 style={{fontSize:18,fontWeight:700,color:"#1e293b",margin:0}}>Create Counterpart Issue</h3>
          <button onClick={onClose} style={{background:"#f3f4f6",border:"none",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:16,color:"#6b7280",display:"flex",alignItems:"center",justifyContent:"center"}}>X</button>
        </div>
        <div className="mb-4 p-3 rounded-lg" style={{background:"#f8f9fb",border:"1px solid #e5e7eb"}}>
          <div className="flex items-center gap-2 text-sm"><span className="text-gray-400">Source:</span><a href={`${JIRA_BASE}${issue.key}`} target="_blank" rel="noopener noreferrer" className="font-mono font-bold no-underline" style={{color:gp(issue.key).acc}}>{issue.key}</a><SBadge status={issue.status}/></div>
          <div className="text-sm text-gray-600 mt-1">{issue.summary}</div>
        </div>
        <div className="mb-4">
          <label style={{display:"block",fontSize:11,fontWeight:700,color:"#9ca3af",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.05em"}}>Target Project</label>
          <div className="flex gap-2">{targets.map(p=>{const ps=PC[p];const a=sel===p;return <button key={p} onClick={()=>setSel(p)} style={{background:a?ps.bg:"#f9fafb",color:a?ps.acc:"#9ca3af",border:`2px solid ${a?ps.acc:"#e5e7eb"}`,cursor:"pointer",borderRadius:10,padding:"8px 18px",fontSize:13,fontWeight:700}}>{{GGS:"Server (GGS)",CLPLG:"Plugin (CLPLG)",SST2:"Game (SST2)"}[p]}</button>})}</div>
        </div>
        <div className="mb-4">
          <label style={{display:"block",fontSize:11,fontWeight:700,color:"#9ca3af",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.05em"}}>Title</label>
          <input type="text" value={title} onChange={e=>setTitle(e.target.value)} style={{width:"100%",padding:"10px 14px",borderRadius:10,border:"1px solid #e5e7eb",background:"#f9fafb",fontSize:14,color:"#1e293b"}}/>
        </div>
        <div className="mb-5">
          <label style={{display:"block",fontSize:11,fontWeight:700,color:"#9ca3af",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.05em"}}>Description</label>
          <textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={6} style={{width:"100%",padding:"10px 14px",borderRadius:10,border:"1px solid #e5e7eb",background:"#f9fafb",fontSize:13,color:"#1e293b",fontFamily:"inherit",resize:"vertical"}}/>
        </div>
        {res&&<div className="mb-4 p-3 rounded-lg text-sm" style={{background:res.ok?"#ecfdf5":"#fef2f2",color:res.ok?"#065f46":"#991b1b",border:`1px solid ${res.ok?"#a7f3d0":"#fecaca"}`}}>{res.ok?<>Created: <a href={`${JIRA_BASE}${res.key}`} target="_blank" rel="noopener noreferrer" className="font-mono font-bold">{res.key}</a> (linked to {issue.key})</>:<>Error: {res.err}</>}</div>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} style={{background:"#f3f4f6",color:"#374151",border:"1px solid #e5e7eb",borderRadius:10,padding:"10px 22px",fontSize:13,fontWeight:600,cursor:"pointer"}}>{res?"Close":"Cancel"}</button>
          {!res&&<button onClick={go} disabled={busy} style={{background:busy?"#d1d5db":"linear-gradient(135deg,#7c3aed,#db2777)",color:"#fff",border:"none",borderRadius:10,padding:"10px 22px",fontSize:13,fontWeight:700,cursor:busy?"wait":"pointer"}}>
            {busy?"Creating...":"Create & Link"}</button>}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard(){
  const [data,setData]=useState(initData);
  const [slack,setSlack]=useState(initSlack);
  const [lastR,setLastR]=useState(null);
  const [filter,setFilter]=useState("all");
  const [selSt,setSelSt]=useState(new Set());
  const [search,setSearch]=useState("");
  const [linking,setLinking]=useState(null);
  const [linkRes,setLinkRes]=useState({});
  const [dismissed,setDismissed]=useState(new Set());
  const [modal,setModal]=useState(null);
  const [selAreas,setSelAreas]=useState(new Set());
  const [showProjDd,setShowProjDd]=useState(false);
  const [showAreaDd,setShowAreaDd]=useState(false);

  const all=[...(data.GGS||[]),...(data.CLPLG||[]),...(data.SST2||[])];
  const togSt=s=>setSelSt(p=>{const n=new Set(p);n.has(s)?n.delete(s):n.add(s);return n});
  const togArea=a=>setSelAreas(p=>{const n=new Set(p);n.has(a)?n.delete(a):n.add(a);return n});

  const lk=new Set();
  all.forEach(i=>i.links.forEach(x=>{const lp=x.key.split("-")[0],ip=i.key.split("-")[0];if(lp!==ip&&["GGS","CLPLG","SST2"].includes(lp)){lk.add(i.key);lk.add(x.key)}}));

  // Compute feature areas (used for both filter and breakdown)
  const fKW=["runway","matchmaking","bot","friend","gift","auth","score","dashboard","notification","push","profile","coupon"];
  const getArea=i=>{const s=i.summary.toLowerCase();for(const w of fKW){if(s.includes(w))return w[0].toUpperCase()+w.slice(1)}return "Other"};
  const fa={};all.forEach(i=>{const a=getArea(i);(fa[a]||(fa[a]=[])).push(i)});
  const areaKeys=Object.keys(fa).sort((a,b)=>fa[b].length-fa[a].length);

  let flt=all;
  if(filter!=="all")flt=flt.filter(i=>i.key.startsWith(filter));
  if(selAreas.size>0)flt=flt.filter(i=>selAreas.has(getArea(i)));
  if(selSt.size>0)flt=flt.filter(i=>selSt.has(getGroup(i.status)));
  if(search){const q=search.toLowerCase();flt=flt.filter(i=>i.key.toLowerCase().includes(q)||i.summary.toLowerCase().includes(q)||i.assignee.toLowerCase().includes(q))}
  flt.sort((a,b)=>{const ai=SG_ORDER.indexOf(getGroup(a.status)),bi=SG_ORDER.indexOf(getGroup(b.status));return(ai<0?99:ai)-(bi<0?99:bi)});

  const pc={GGS:data.GGS?.length||0,CLPLG:data.CLPLG?.length||0,SST2:data.SST2?.length||0};
  const grpCounts={};SG_ORDER.forEach(g=>{grpCounts[g]=all.filter(i=>getGroup(i.status)===g).length});

  const ul=all.filter(i=>!lk.has(i.key));
  const sw=new Set(["the","a","an","is","in","for","to","of","and","or","from","with","should","be","not","it","when","if","can","need","this"]);
  const mkw=(a,b)=>{const aw=a.summary.toLowerCase().split(/\s+/).filter(w=>w.length>2&&!sw.has(w));const bw=new Set(b.summary.toLowerCase().split(/\s+/).filter(w=>w.length>2&&!sw.has(w)));return aw.filter(w=>bw.has(w)).length>=2};
  const sug=[];
  const gU=ul.filter(i=>i.key.startsWith("GGS")),cU=ul.filter(i=>i.key.startsWith("CLPLG")),sU=ul.filter(i=>i.key.startsWith("SST2"));
  gU.forEach(g=>{cU.forEach(c=>{if(mkw(g,c))sug.push({f:g.key,t:c.key,fs:g.summary,ts:c.summary})});sU.forEach(s=>{if(mkw(g,s))sug.push({f:g.key,t:s.key,fs:g.summary,ts:s.summary})})});
  const visSug=sug.filter(s=>{const pk=`${s.f}-${s.t}`;return !dismissed.has(pk)&&linkRes[pk]!=="ok"});
  const sugK=new Set(visSug.flatMap(s=>[s.f,s.t]));

  // Counterpart button rules:
  // SST2 (Game) cards → need both GGS (Server) and CLPLG (Plugin) buttons unless already linked
  // CLPLG (Plugin) cards → need GGS (Server) button unless already linked
  // GGS (Server) cards → need CLPLG (Plugin) button unless already linked
  // Nobody gets a "create in SST2" button (Game issues come from product, not mirrored)
  const REQ_TARGETS={SST2:["GGS","CLPLG"],CLPLG:["GGS"],GGS:["CLPLG"]};
  const ncpMap={};
  all.forEach(i=>{
    const proj=i.key.split("-")[0];
    const required=REQ_TARGETS[proj];
    if(!required)return;
    const linkedProjs=new Set(i.links.map(x=>x.key.split("-")[0]).filter(p=>p!==proj));
    const missing=required.filter(p=>!linkedProjs.has(p));
    if(missing.length>0)ncpMap[i.key]=missing;
  });

  const doLink=async(f,t)=>{
    const pk=`${f}-${t}`;setLinking(pk);
    try{await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:`Use Atlassian MCP: create issue link on cloud ${CLOUD_ID}. Link ${f} to ${t} with "Relates" type.`}],mcp_servers:[{type:"url",url:MCP_URL,name:"atlassian"}]})});
      setLinkRes(p=>({...p,[pk]:"ok"}));
    }catch{setLinkRes(p=>({...p,[pk]:"err"}))}
    setLinking(null);
  };

  const [refreshing,setRefreshing]=useState(false);
  const [refreshErr,setRefreshErr]=useState(null);

  const doRefresh=async()=>{
    setRefreshing(true);setRefreshErr(null);
    try{
      // Fire both API calls in parallel — single connector approval prompt
      const slackChannels=["C08FDAPECKE","C0972DJ5BMY","C08HU8AR3T8","C09S3QH0ZQA","C08GZ7W5BV4","C09GVKW6HH6"];
      const slackNames={"C08FDAPECKE":"glow-server","C0972DJ5BMY":"glow-runway","C08HU8AR3T8":"glow-game-server-devlopers","C09S3QH0ZQA":"glow-social","C08GZ7W5BV4":"glow-client-server","C09GVKW6HH6":"glow-runway-client-server"};
      const oldest=Math.floor(Date.now()/1000)-86400;

      const jiraPrompt=`You have access to Atlassian MCP tools. Execute these 3 JQL searches on cloud ID ${CLOUD_ID} and return the results.

Search 1 (GGS): project = GGS AND issuetype != Epic AND (status != Done OR (status = Done AND resolved >= -7d)) ORDER BY status ASC, updated DESC — max 100 results, fields: summary, status, issuetype, priority, assignee, issuelinks
Search 2 (CLPLG): project = CLPLG AND issuetype != Epic AND (status != Done OR (status = Done AND resolved >= -7d)) ORDER BY status ASC, updated DESC — max 100 results, fields: summary, status, issuetype, priority, assignee, issuelinks
Search 3 (SST2): project = SST2 AND issuetype != Epic AND (assignee = 557058:0b20c326-8d11-41ef-8e7d-6651e435f006 OR watcher = 557058:0b20c326-8d11-41ef-8e7d-6651e435f006) AND (status != Done OR (status = Done AND resolved >= -7d)) ORDER BY status ASC, updated DESC — max 100 results, fields: summary, status, issuetype, priority, assignee, issuelinks

After getting all results, output a single JSON object (no markdown fences) with this exact structure:
{"GGS":[array],"CLPLG":[array],"SST2":[array]}
Each item: {"k":"KEY-123","t":"Task","s":"Status","p":"Priority","a":"Assignee Name","m":"Summary text","l":[{"t":"link type","k":"LINKED-KEY"}]}
For issuelinks: include both outward and inward links. Only include links where the linked key starts with GGS, CLPLG, or SST2.
Output ONLY the JSON, nothing else.`;

      const slackPrompt=`You have access to Slack MCP tools. Read the last 24 hours of messages from these channels (use oldest=${oldest}):
${slackChannels.map(id=>`- ${slackNames[id]} (${id})`).join("\n")}

Then analyze all messages and output a single JSON object (no markdown fences) with this structure:
{"channels":[{"id":"ID","name":"name","active":true/false}],"items":[{"ch":"channel-name","sev":"critical|high|medium|info","title":"short title","desc":"1-2 sentence description","who":"Person who reported/raised it","jira":"KEY-123 or null","owner":"Person responsible for action or null","action":"concrete action item or null","done":true/false,"resolution":"how it was resolved or null"}]}

Mark a channel as active:true if it had messages in the last 24h, false if empty.
Each item represents one issue/topic from Slack. Use severity: critical for blockers/outages, high for bugs/regressions, medium for tasks/investigations, info for deployments/updates.
Set done:true and provide resolution if Slack messages indicate the issue was fixed, deployed, or resolved.
Set owner to the person responsible for the action item, and action to what they need to do. If the item is purely informational (e.g. a deployment announcement), owner and action can be null.
Output ONLY the JSON, nothing else.`;

      const [jiraRes,slackRes]=await Promise.all([
        fetch("https://api.anthropic.com/v1/messages",{
          method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:16000,
            messages:[{role:"user",content:jiraPrompt}],
            mcp_servers:[{type:"url",url:MCP_URL,name:"atlassian"}]
          })
        }),
        fetch("https://api.anthropic.com/v1/messages",{
          method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:8000,
            messages:[{role:"user",content:slackPrompt}],
            mcp_servers:[{type:"url",url:"https://mcp.slack.com/mcp",name:"slack"}]
          })
        })
      ]);

      const [jiraData,slackData]=await Promise.all([jiraRes.json(),slackRes.json()]);

      // Parse JIRA
      const jiraTxt=(jiraData.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");
      let jiraJson=null;
      const jiraClean=jiraTxt.replace(/```json|```/g,"").trim();
      try{jiraJson=JSON.parse(jiraClean)}catch{
        const m=jiraTxt.match(/\{[\s\S]*"GGS"\s*:\s*\[[\s\S]*\][\s\S]*"CLPLG"\s*:\s*\[[\s\S]*\][\s\S]*"SST2"\s*:\s*\[[\s\S]*\]\s*\}/);
        if(m)try{jiraJson=JSON.parse(m[0])}catch{}
      }

      // Parse Slack
      const slackTxt=(slackData.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");
      let slackJson=null;
      const slackClean=slackTxt.replace(/```json|```/g,"").trim();
      try{slackJson=JSON.parse(slackClean)}catch{
        const m2=slackTxt.match(/\{[\s\S]*"channels"\s*:\s*\[[\s\S]*\][\s\S]*"items"\s*:\s*\[[\s\S]*\]\s*\}/);
        if(m2)try{slackJson=JSON.parse(m2[0])}catch{}
      }

      let updated=false;
      if(jiraJson&&jiraJson.GGS){
        const nr=arr=>(arr||[]).filter(i=>i.t!=="Epic").map(i=>({key:i.k,type:i.t,status:i.s,priority:i.p,assignee:i.a,summary:i.m,links:(i.l||[]).map(x=>({type:x.t,key:x.k}))}));
        setData({GGS:nr(jiraJson.GGS),CLPLG:nr(jiraJson.CLPLG),SST2:nr(jiraJson.SST2)});
        updated=true;
      }
      if(slackJson&&slackJson.channels){
        setSlack({ts:new Date().toISOString(),...slackJson});
        updated=true;
      }

      if(updated) setLastR(new Date());
      else setRefreshErr("Could not parse response data from JIRA or Slack");
    }catch(e){setRefreshErr(e.message)}
    setRefreshing(false);
  };

  return(
    <div style={{minHeight:"100vh",background:"#f8f9fb",color:"#1e293b",fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');*{font-family:'DM Sans',system-ui,sans-serif;box-sizing:border-box}.font-mono{font-family:'JetBrains Mono',monospace}@keyframes spin{to{transform:rotate(360deg)}}.spin{animation:spin 1s linear infinite}textarea:focus,input:focus{outline:2px solid #8b5cf6;outline-offset:-1px}`}</style>

      {/* HEADER */}
      <div style={{background:"linear-gradient(135deg,#fff 0%,#f0f4ff 50%,#fdf2f8 100%)",borderBottom:"1px solid #e5e7eb"}} className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 style={{fontSize:22,fontWeight:800,color:"#7c3aed",margin:0}}>Glow Fashion Idol</h1>
                <span style={{background:"#f5f3ff",color:"#7c3aed",border:"1px solid #ddd6fe",borderRadius:20,padding:"4px 12px",fontSize:11,fontWeight:700}}>Multiplayer Services</span>
              </div>
              <p style={{margin:0,fontSize:13,color:"#9ca3af"}}>Cross-project status — GGS / CLPLG / SST2</p>
            </div>
            <div className="flex items-center gap-3">
              {lastR&&<span style={{fontSize:11,color:"#9ca3af"}}>{lastR.toLocaleTimeString()}</span>}
              <button onClick={doRefresh} disabled={refreshing} style={{background:refreshing?"#e0e7ff":"linear-gradient(135deg,#7c3aed,#db2777)",color:refreshing?"#6366f1":"#fff",border:"none",cursor:refreshing?"wait":"pointer",borderRadius:12,padding:"10px 22px",fontSize:13,fontWeight:700,boxShadow:refreshing?"none":"0 4px 14px rgba(124,58,237,0.25)",display:"flex",alignItems:"center",gap:8}}>
                <span style={refreshing?{display:"inline-block",animation:"spin 1s linear infinite"}:{}}>{"\u27F3"}</span> {refreshing?"Refreshing...":"Refresh"}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {SG_ORDER.map(g=>{const st=SG_STYLE[g];const cnt=grpCounts[g];const ic={BLOCKED:"\uD83D\uDEAB","IN DEV":"\u26A1","IN QA":"\uD83D\uDD0D",TODO:"\uD83D\uDCCB",DONE:"\u2705"}[g];return(
              <div key={g} style={{background:st.bg,border:`1px solid ${st.bdr}`,borderRadius:12,padding:12,cursor:"pointer",opacity:selSt.size>0&&!selSt.has(g)?0.5:1,outline:selSt.has(g)?`2px solid ${st.dot}`:"none",outlineOffset:1,transition:"all 0.15s"}} onClick={()=>togSt(g)}>
                <div className="flex items-center justify-between mb-1"><span style={{fontSize:16}}>{ic}</span><span style={{fontSize:22,fontWeight:800,color:st.dot}}>{cnt}</span></div>
                <span style={{fontSize:11,color:st.text,fontWeight:600}}>{g}</span>
              </div>
            )})}
          </div>
        </div>
      </div>

      {/* REFRESH STATUS */}
      {refreshing&&<div className="max-w-7xl mx-auto px-6 pt-4">
        <div style={{background:"linear-gradient(135deg,#eff6ff,#f5f3ff)",border:"1px solid #c7d2fe",borderRadius:12,padding:16,display:"flex",alignItems:"center",gap:12}}>
          <span style={{display:"inline-block",animation:"spin 1s linear infinite",fontSize:20}}>{"\u27F3"}</span>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:700,color:"#3730a3"}}>Refreshing JIRA + Slack data...</div>
            <div style={{fontSize:12,color:"#6366f1"}}>Fetching from Atlassian and Slack via API</div>
          </div>
        </div>
      </div>}
      {refreshErr&&<div className="max-w-7xl mx-auto px-6 pt-4">
        <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:12,padding:16,display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:20}}>{"⚠️"}</span>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:700,color:"#991b1b"}}>Refresh failed</div>
            <div style={{fontSize:12,color:"#b91c1c"}}>{refreshErr}</div>
          </div>
          <button onClick={()=>setRefreshErr(null)} style={{background:"#fee2e2",border:"none",borderRadius:8,width:28,height:28,cursor:"pointer",fontSize:14,color:"#991b1b",display:"flex",alignItems:"center",justifyContent:"center"}}>X</button>
        </div>
      </div>}

      {/* FILTERS */}
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center gap-3">
          {/* Project dropdown */}
          <div style={{position:"relative"}}>
            <button onClick={()=>{setShowProjDd(p=>!p);setShowAreaDd(false)}} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,padding:"7px 14px",fontSize:12,fontWeight:600,cursor:"pointer",color:"#374151",display:"flex",alignItems:"center",gap:6,minWidth:120}}>
              {filter==="all"?"All Projects":PL[filter]||filter}
              <span style={{fontSize:10,opacity:0.4,marginLeft:"auto"}}>{"\u25BC"}</span>
            </button>
            {showProjDd&&<div style={{position:"absolute",top:"110%",left:0,background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,boxShadow:"0 8px 24px rgba(0,0,0,0.08)",zIndex:50,minWidth:160,overflow:"hidden",padding:4}}>
              {[{k:"all",l:"All Projects",n:all.length},{k:"GGS",l:"Server (GGS)",n:pc.GGS},{k:"CLPLG",l:"Plugin (CLPLG)",n:pc.CLPLG},{k:"SST2",l:"Game (SST2)",n:pc.SST2}].map(f=>(
                <button key={f.k} onClick={()=>{setFilter(f.k);setShowProjDd(false)}} style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",background:filter===f.k?"#f3f4f6":"transparent",color:"#374151",border:"none",borderRadius:6,padding:"8px 12px",fontSize:12,fontWeight:filter===f.k?700:500,cursor:"pointer",textAlign:"left"}}>
                  <span>{f.l}</span><span style={{color:"#9ca3af",fontSize:11}}>{f.n}</span>
                </button>
              ))}
            </div>}
          </div>

          {/* Feature area dropdown (multi-select) */}
          <div style={{position:"relative"}}>
            <button onClick={()=>{setShowAreaDd(p=>!p);setShowProjDd(false)}} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,padding:"7px 14px",fontSize:12,fontWeight:600,cursor:"pointer",color:"#374151",display:"flex",alignItems:"center",gap:6,minWidth:140}}>
              {selAreas.size===0?"All Areas":selAreas.size===1?[...selAreas][0]:`${selAreas.size} areas`}
              <span style={{fontSize:10,opacity:0.4,marginLeft:"auto"}}>{"\u25BC"}</span>
            </button>
            {showAreaDd&&<div style={{position:"absolute",top:"110%",left:0,background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,boxShadow:"0 8px 24px rgba(0,0,0,0.08)",zIndex:50,minWidth:200,overflow:"hidden",padding:4,maxHeight:320,overflowY:"auto"}}>
              <button onClick={()=>setSelAreas(new Set())} style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",background:selAreas.size===0?"#f3f4f6":"transparent",color:"#374151",border:"none",borderRadius:6,padding:"8px 12px",fontSize:12,fontWeight:selAreas.size===0?700:500,cursor:"pointer",textAlign:"left"}}>
                <span>All Areas</span><span style={{color:"#9ca3af",fontSize:11}}>{all.length}</span>
              </button>
              {areaKeys.map(a=>{const active=selAreas.has(a);return(
                <button key={a} onClick={()=>togArea(a)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",background:active?"#f5f3ff":"transparent",color:active?"#7c3aed":"#374151",border:"none",borderRadius:6,padding:"8px 12px",fontSize:12,fontWeight:active?700:500,cursor:"pointer",textAlign:"left"}}>
                  <span style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{width:14,height:14,borderRadius:4,border:`2px solid ${active?"#7c3aed":"#d1d5db"}`,background:active?"#7c3aed":"transparent",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#fff",flexShrink:0}}>{active?"\u2713":""}</span>
                    {a}
                  </span>
                  <span style={{color:"#9ca3af",fontSize:11}}>{fa[a].length}</span>
                </button>
              )})}
            </div>}
          </div>

          {/* Status chips (inline, since cards also toggle) */}
          {selSt.size>0&&<div className="flex items-center gap-1">
            {[...selSt].map(g=>{const st=SG_STYLE[g];return <span key={g} style={{background:st.bg,color:st.text,border:`1px solid ${st.bdr}`,borderRadius:20,padding:"4px 10px",fontSize:11,fontWeight:600,display:"inline-flex",alignItems:"center",gap:4}}>
              {g}<button onClick={()=>togSt(g)} style={{background:"none",border:"none",cursor:"pointer",color:st.text,fontSize:12,padding:0,marginLeft:2,lineHeight:1}}>{"\u2715"}</button>
            </span>})}
            <button onClick={()=>setSelSt(new Set())} style={{background:"none",border:"none",cursor:"pointer",color:"#9ca3af",fontSize:11,padding:"4px 6px"}}>Clear</button>
          </div>}

          {/* Search */}
          <input placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} style={{background:"#fff",color:"#1e293b",border:"1px solid #e5e7eb",borderRadius:10,padding:"7px 14px",fontSize:12,width:160}}/>
          <span style={{fontSize:11,color:"#9ca3af",marginLeft:"auto"}}>{flt.length} issues</span>
        </div>
      </div>

      {/* Close dropdowns on outside click */}
      {(showProjDd||showAreaDd)&&<div style={{position:"fixed",inset:0,zIndex:40}} onClick={()=>{setShowProjDd(false);setShowAreaDd(false)}}/>}

      {/* LINK SUGGESTIONS */}
      {visSug.length>0&&<div className="max-w-7xl mx-auto px-6 pb-3">
        <details open style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:12,overflow:"hidden"}}>
          <summary style={{padding:14,cursor:"pointer",fontSize:13,fontWeight:700,color:"#92400e"}}>
            {"\uD83D\uDCA1"} {visSug.length} link suggestion{visSug.length>1?"s":""}
          </summary>
          <div style={{padding:"0 14px 14px",display:"flex",flexDirection:"column",gap:8}}>
            {visSug.map((s,i)=>{const pk=`${s.f}-${s.t}`;const busy=linking===pk;return(
              <div key={pk} style={{display:"flex",alignItems:"center",gap:8,padding:10,borderRadius:10,background:"#fff",border:"1px solid #fde68a",fontSize:12}}>
                <a href={`${JIRA_BASE}${s.f}`} target="_blank" rel="noopener noreferrer" className="font-mono" style={{fontWeight:700,color:gp(s.f).acc,textDecoration:"none",flexShrink:0}}>{s.f}</a>
                <span style={{color:"#6b7280",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:170}}>{s.fs}</span>
                <span style={{color:"#d97706",flexShrink:0}}>{"\u27F7"}</span>
                <a href={`${JIRA_BASE}${s.t}`} target="_blank" rel="noopener noreferrer" className="font-mono" style={{fontWeight:700,color:gp(s.t).acc,textDecoration:"none",flexShrink:0}}>{s.t}</a>
                <span style={{color:"#6b7280",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:170}}>{s.ts}</span>
                <div style={{marginLeft:"auto",flexShrink:0,display:"flex",gap:6,alignItems:"center"}}>
                  <button onClick={()=>setDismissed(p=>{const n=new Set(p);n.add(pk);return n})} style={{background:"#f3f4f6",color:"#9ca3af",border:"1px solid #e5e7eb",borderRadius:8,padding:"5px 10px",fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}} title="Dismiss suggestion">Dismiss</button>
                  <button onClick={()=>doLink(s.f,s.t)} disabled={busy} style={{background:busy?"#e5e7eb":"#7c3aed",color:busy?"#9ca3af":"#fff",border:"none",borderRadius:8,padding:"5px 12px",fontSize:11,fontWeight:700,cursor:busy?"wait":"pointer",whiteSpace:"nowrap"}}>{busy?"Linking...":"\uD83D\uDD17 Link in JIRA"}</button>
                </div>
              </div>
            )})}
          </div>
        </details>
      </div>}

      {/* ISSUE LIST */}
      <div className="max-w-7xl mx-auto px-6 pb-8">
        <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,boxShadow:"0 1px 3px rgba(0,0,0,0.04)",overflow:"hidden"}}>
          {flt.map((issue,i)=><div key={issue.key} style={i>0?{borderTop:"1px solid #f3f4f6"}:{}}><Row issue={issue} isLinked={lk.has(issue.key)} allIssues={all} onMirror={(iss,tgts)=>setModal({issue:iss,targets:tgts})} ncpTargets={ncpMap[issue.key]}/></div>)}
          {flt.length===0&&<div style={{padding:48,textAlign:"center",color:"#9ca3af",fontSize:14}}>No issues match your filters</div>}
        </div>
      </div>

      {/* SLACK INTELLIGENCE */}
      <div className="max-w-7xl mx-auto px-6 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <span style={{fontSize:15}}>{"💬"}</span>
          <h2 style={{fontSize:11,fontWeight:800,color:"#9ca3af",margin:0,textTransform:"uppercase",letterSpacing:"0.08em"}}>Slack Intelligence (24h)</h2>
          <div className="flex gap-1 ml-2">{slack.channels.filter(c=>c.active).map(c=><span key={c.id} style={{background:"#f0fdf4",color:"#166534",border:"1px solid #bbf7d0",borderRadius:12,padding:"2px 8px",fontSize:10,fontWeight:600}}>#{c.name}</span>)}</div>
          {slack.channels.filter(c=>!c.active).length>0&&<span style={{color:"#d1d5db",fontSize:10}}>{slack.channels.filter(c=>!c.active).length} quiet</span>}
          <span style={{fontSize:11,color:"#9ca3af",marginLeft:"auto"}}>{(slack.items||[]).filter(x=>!x.done).length} open / {(slack.items||[]).length} total</span>
        </div>

        <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden"}}>
          {(slack.items||[]).map((item,i)=>{
            const sevC={critical:{bg:"#fef2f2",text:"#991b1b",dot:"#ef4444"},high:{bg:"#fff7ed",text:"#9a3412",dot:"#f97316"},medium:{bg:"#fffbeb",text:"#92400e",dot:"#eab308"},info:{bg:"#f0fdf4",text:"#166534",dot:"#22c55e"}}[item.sev]||{bg:"#f3f4f6",text:"#374151",dot:"#9ca3af"};
            return(
              <div key={i} style={{padding:"12px 16px",borderTop:i>0?"1px solid #f3f4f6":"none",opacity:item.done?0.55:1}}>
                <div className="flex items-start gap-3">
                  <div style={{marginTop:3,flexShrink:0}}>
                    {item.done
                      ?<span style={{width:16,height:16,borderRadius:4,border:"2px solid #10b981",background:"#10b981",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#fff"}}>{"✓"}</span>
                      :<span style={{display:"inline-block",width:10,height:10,borderRadius:"50%",background:sevC.dot,marginTop:1,marginLeft:3}}/>
                    }
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span style={{fontSize:13,fontWeight:700,color:item.done?"#9ca3af":"#1e293b"}}>{item.title}</span>
                      {item.done&&<span style={{background:"#ecfdf5",color:"#065f46",border:"1px solid #a7f3d0",borderRadius:12,padding:"1px 8px",fontSize:10,fontWeight:600}}>Done</span>}
                      {!item.done&&(item.sev==="critical"||item.sev==="high")&&<span style={{background:sevC.bg,color:sevC.text,border:`1px solid ${sevC.dot}33`,borderRadius:12,padding:"1px 8px",fontSize:10,fontWeight:600}}>Open</span>}
                    </div>
                    <p style={{fontSize:12,color:item.done?"#b0b0b0":"#6b7280",margin:"0 0 6px",lineHeight:1.5}}>{item.desc}</p>
                    <div className="flex items-center gap-3 flex-wrap" style={{fontSize:11}}>
                      <span style={{color:"#9ca3af"}}>#{item.ch}</span>
                      <span style={{color:"#6b7280"}}>— {item.who}</span>
                      {item.jira&&<a href={`${JIRA_BASE}${item.jira}`} target="_blank" rel="noopener noreferrer" className="font-mono" style={{color:"#7c3aed",fontWeight:700,textDecoration:"none",fontSize:11}}>{item.jira}</a>}
                      {item.owner&&!item.done&&<span style={{color:"#3730a3",fontWeight:600}}>{"→"} {item.owner}{item.action?`: ${item.action}`:""}</span>}
                      {item.done&&item.resolution&&<span style={{color:"#059669",fontStyle:"italic"}}>{"✓"} {item.resolution}</span>}
                    </div>
                  </div>
                  <span style={{background:sevC.bg,color:sevC.text,border:`1px solid ${sevC.dot}33`,borderRadius:8,padding:"3px 8px",fontSize:10,fontWeight:700,textTransform:"uppercase",flexShrink:0,letterSpacing:"0.05em"}}>{item.sev}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL */}
      {modal&&<Modal issue={modal.issue} targets={modal.targets.length?modal.targets:["GGS","CLPLG","SST2"].filter(p=>p!==modal.issue.key.split("-")[0])} onClose={()=>setModal(null)}/>}
    </div>
  );
}
