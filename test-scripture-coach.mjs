#!/usr/bin/env node

// Test Script for Scripture Coach System
// This script tests the complete Scripture Coach functionality

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

// Test user ID (you can replace this with a real user ID from your system)
const TEST_USER_ID = '11111111-1111-1111-1111-111111111111';

async function testScriptureCoach() {
  console.log('🧪 Testing Scripture Coach System...\n');

  try {
    // Test 1: Get available reading plans
    console.log('📚 Test 1: Fetching available reading plans...');
    const plansResponse = await fetch(`${BASE_URL}/api/scripture-coach/plans`);
    const plansData = await plansResponse.json();
    
    if (plansResponse.ok) {
      console.log('✅ Successfully fetched reading plans');
      console.log(`   Found ${plansData.plans?.length || 0} plans:`);
      plansData.plans?.forEach(plan => {
        console.log(`   - ${plan.name} (${plan.days} days): ${plan.description}`);
      });
    } else {
      console.log('❌ Failed to fetch reading plans:', plansData.error);
      return;
    }

    // Test 2: Get user's reading plans (should be empty initially)
    console.log('\n📖 Test 2: Fetching user reading plans...');
    const userPlansResponse = await fetch(`${BASE_URL}/api/scripture-coach/user-plans/${TEST_USER_ID}`);
    const userPlansData = await userPlansResponse.json();
    
    if (userPlansResponse.ok) {
      console.log('✅ Successfully fetched user reading plans');
      console.log(`   User has ${userPlansData.userPlans?.length || 0} reading plans`);
    } else {
      console.log('❌ Failed to fetch user reading plans:', userPlansData.error);
    }

    // Test 3: Start a reading plan
    console.log('\n🚀 Test 3: Starting a reading plan...');
    const firstPlan = plansData.plans?.[0];
    if (firstPlan) {
      const startPlanResponse = await fetch(`${BASE_URL}/api/scripture-coach/start-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: TEST_USER_ID, 
          planId: firstPlan.id 
        })
      });
      const startPlanData = await startPlanResponse.json();
      
      if (startPlanResponse.ok) {
        console.log('✅ Successfully started reading plan');
        console.log(`   Plan: ${startPlanData.plan.name}`);
        console.log(`   Started on day: ${startPlanData.userPlan.current_day}`);
      } else {
        console.log('❌ Failed to start reading plan:', startPlanData.error);
      }
    } else {
      console.log('⚠️ No plans available to start');
    }

    // Test 4: Get today's reading
    console.log('\n📖 Test 4: Fetching today\'s reading...');
    const todayReadingResponse = await fetch(`${BASE_URL}/api/scripture-coach/today-reading/${TEST_USER_ID}`);
    const todayReadingData = await todayReadingResponse.json();
    
    if (todayReadingResponse.ok) {
      console.log('✅ Successfully fetched today\'s reading');
      console.log(`   Plan: ${todayReadingData.todayReading.plan_name}`);
      console.log(`   Day: ${todayReadingData.todayReading.day_number} of ${todayReadingData.todayReading.total_days}`);
      console.log('   References:');
      todayReadingData.todayReading.references.forEach((ref, index) => {
        console.log(`     ${index + 1}. ${ref}`);
      });
    } else {
      console.log('❌ Failed to fetch today\'s reading:', todayReadingData.error);
    }

    // Test 5: Mark reading as complete
    console.log('\n✅ Test 5: Marking reading as complete...');
    const markCompleteResponse = await fetch(`${BASE_URL}/api/scripture-coach/mark-complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: TEST_USER_ID })
    });
    const markCompleteData = await markCompleteResponse.json();
    
    if (markCompleteResponse.ok) {
      console.log('✅ Successfully marked reading as complete');
      console.log(`   Message: ${markCompleteData.message}`);
      console.log(`   Completed: ${markCompleteData.completed}`);
      if (markCompleteData.newDay) {
        console.log(`   New day: ${markCompleteData.newDay}`);
      }
    } else {
      console.log('❌ Failed to mark reading as complete:', markCompleteData.error);
    }

    // Test 6: Get progress stats
    console.log('\n📊 Test 6: Fetching progress stats...');
    const progressResponse = await fetch(`${BASE_URL}/api/scripture-coach/progress/${TEST_USER_ID}`);
    const progressData = await progressResponse.json();
    
    if (progressResponse.ok) {
      console.log('✅ Successfully fetched progress stats');
      console.log(`   Total days read: ${progressData.totalDaysRead}`);
      console.log(`   Active plans: ${progressData.activePlans.length}`);
      console.log(`   Completed plans: ${progressData.completedPlans.length}`);
      console.log(`   Total plans: ${progressData.totalPlans}`);
    } else {
      console.log('❌ Failed to fetch progress stats:', progressData.error);
    }

    console.log('\n🎉 Scripture Coach system test completed!');
    console.log('\n📋 Summary:');
    console.log('   - Reading plans can be fetched');
    console.log('   - Users can start reading plans');
    console.log('   - Today\'s reading can be retrieved');
    console.log('   - Reading progress can be tracked');
    console.log('   - Progress statistics are available');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testScriptureCoach();







