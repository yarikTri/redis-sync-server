#!/usr/bin/env node
// @ts-check

import * as D from 'dotenv'
D.config();

import { Server } from "./server.js"

new Server()
