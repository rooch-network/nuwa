import express from 'express';
import cors from 'cors';
import { AgentDIDService } from '../services/agentDIDService';
import { generateCustodianDIDDocument } from '../utils/didUtils';
import type { CreateAgentDIDRequest, SwitchControllerRequest } from '../types';

const router = express.Router();
const agentDIDService = new AgentDIDService();

// CORS configuration
router.use(cors());
router.use(express.json());

/**
 * Get Custodian DID document
 * Based on NIP-3, the DID document includes service definitions and authentication methods
 */
router.get('/did', (req, res) => {
  try {
    const didDocument = generateCustodianDIDDocument();
    res.json(didDocument);
  } catch (error) {
    console.error('Failed to get DID document:', error);
    res.status(500).json({
      error: 'Failed to get DID document',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Create Agent DID
 * Process creation requests from the frontend
 */
router.post('/agent-did', async (req, res) => {
  try {
    const createRequest: CreateAgentDIDRequest = req.body;
    
    // Validate request data
    if (!createRequest.userIdentifierHash || !createRequest.devicePublicKey) {
      return res.status(400).json({
        error: 'Incomplete request data',
        message: 'User identifier hash and device public key are required'
      });
    }
    
    // Create Agent DID
    const result = await agentDIDService.createAgentDID(createRequest);
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Failed to create Agent DID:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create Agent DID',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Switch the controller of an Agent DID
 */
router.post('/switch-controller', async (req, res) => {
  try {
    const switchRequest: SwitchControllerRequest = req.body;
    
    // Validate request data
    if (!switchRequest.agentDID || !switchRequest.newController || !switchRequest.signature) {
      return res.status(400).json({
        error: 'Incomplete request data',
        message: 'Agent DID, new controller, and signature are required'
      });
    }
    
    // Switch controller
    const result = await agentDIDService.switchController(switchRequest);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Failed to switch controller:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to switch controller',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 