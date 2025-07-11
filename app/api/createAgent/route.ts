import axios from 'axios';
import { NextResponse } from 'next/server';
import FormData from 'form-data';
import { Buffer } from 'buffer';

const API_BASE_URL = process.env.API_BASE_URL;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    
    const characterFileStr = formData.get('character_file') as string;
    const nodeId = formData.get('node_id') as string;
    const agentData = JSON.parse(characterFileStr);

    // Add OPENAI_API_KEY to settings.secrets
    if (agentData.settings && agentData.settings.secrets) {
      agentData.settings.secrets.OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
    } else {
      agentData.settings = {
        secrets: {
          OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
        },
        voice: agentData.settings?.voice || {
          model: "en_US-male-medium",
        },
      };
    }

    const upstreamFormData = new FormData();
    
    const characterBlob = new Blob([JSON.stringify(agentData)], { type: "application/json" });
    const characterBuffer = await new Response(characterBlob).arrayBuffer();
    const buffer = Buffer.from(characterBuffer);
    upstreamFormData.append("character_file", buffer, "agent.character.json");

    upstreamFormData.append("domain", formData.get('domain'));
    upstreamFormData.append("avatar_img", formData.get('avatar_img'));
    upstreamFormData.append("cover_img", formData.get('cover_img'));
    upstreamFormData.append("voice_model", formData.get('voice_model'));
    upstreamFormData.append("wallet_address", formData.get('wallet_address'));
    upstreamFormData.append("organization", "cyrene");

    console.log(nodeId, "nodeId");

    // Use the selected node domain in the API URL
    // ${API_BASE_URL}/agents/${nodeId}/
    // console.log(`${API_BASE_URL}/agents/${nodeId}`, "API URL");
    const response = await axios.post(`${API_BASE_URL}/agents/${nodeId}/`, upstreamFormData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...upstreamFormData.getHeaders(),
      },
    });
  

    return NextResponse.json(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("API Error:", error.response?.data);
    } else {
      console.error("Error:", error);
    }
    return NextResponse.json({ message: 'Failed to create agent' }, { status: 500 });
  }
}