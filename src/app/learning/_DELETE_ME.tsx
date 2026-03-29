"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchLearningPhases, fetchLearningProgress, fetchLearningWeekProgress,
  toggleLearningTopic, toggleLearningWeek,
  upsertLearningPhase, deleteLearningPhase,
  type LearningPhase, type LearningProgress, type LearningWeekProgress,
  type LearningResource, type LearningTrack, type LearningWeek, type LearningPractice,
} from "@/lib/supabase";
import { RecycleBinModal } from "@/components/RecycleBinModal";
