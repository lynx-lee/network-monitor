# Network Monitor API Documentation

## Overview

This document provides documentation for the Network Monitor API, which is used to manage network devices, connections, alerts, and configuration settings.

## Base URL

All API endpoints are relative to the base URL:
```
http://localhost:3001/api
```

## Authentication

Currently, the API does not require authentication. This is subject to change in future versions.

## API Endpoints

### Device Management

#### Get All Devices

**Endpoint:** `GET /devices`

**Description:** Retrieves all network devices.

**Response:**
```json
[
  {
    "id": "device-1234567890",
    "type": "router",
    "label": "Router 1",
    "x": 100,
    "y": 200,
    "ports": [
      {
        "id": "port-1234567890",
        "name": "Port 1",
        "type": "optical",
        "rate": 1000,
        "mac": "00:00:00:00:00:00",
        "status": "up",
        "trafficIn": 100,
        "trafficOut": 200
      }
    ],
    "status": "up",
    "ip": "192.168.1.1",
    "mac": "00:00:00:00:00:00"
  }
]
```

#### Save Device

**Endpoint:** `POST /devices`

**Description:** Creates or updates a network device.

**Request Body:**
```json
{
  "id": "device-1234567890",
  "type": "router",
  "label": "Router 1",
  "x": 100,
  "y": 200,
  "ports": [
    {
      "id": "port-1234567890",
      "name": "Port 1",
      "type": "optical",
      "rate": 1000,
      "mac": "00:00:00:00:00:00",
      "status": "up",
      "trafficIn": 100,
      "trafficOut": 200
    }
  ],
  "status": "up",
  "ip": "192.168.1.1",
  "mac": "00:00:00:00:00:00"
}
```

**Response:**
```json
{ "success": true }
```

#### Delete Device

**Endpoint:** `DELETE /devices/:id`

**Description:** Deletes a network device by ID.

**Response:**
```json
{ "success": true }
```

### Connection Management

#### Get All Connections

**Endpoint:** `GET /connections`

**Description:** Retrieves all network connections.

**Response:**
```json
[
  {
    "id": "conn-1234567890",
    "source": "device-1234567890",
    "target": "device-0987654321",
    "sourcePort": "port-1234567890",
    "targetPort": "port-0987654321",
    "status": "up",
    "traffic": 150
  }
]
```

#### Save Connection

**Endpoint:** `POST /connections`

**Description:** Creates a network connection.

**Request Body:**
```json
{
  "source": "device-1234567890",
  "target": "device-0987654321",
  "sourcePort": "port-1234567890",
  "targetPort": "port-0987654321",
  "status": "up",
  "traffic": 150
}
```

**Response:**
```json
{ "success": true }
```

#### Delete Connection

**Endpoint:** `DELETE /connections/:id`

**Description:** Deletes a network connection by ID.

**Response:**
```json
{ "success": true }
```

### Configuration Management

#### Get All Configurations

**Endpoint:** `GET /config`

**Description:** Retrieves all configuration settings.

**Response:**
```json
{
  "enablePing": true,
  "pingInterval": 5000,
  "warningPingThreshold": 100,
  "criticalPingThreshold": 200,
  "theme": "light"
}
```

#### Get Specific Configuration

**Endpoint:** `GET /config/:key`

**Description:** Retrieves a specific configuration setting by key.

**Response:**
```json
{ "enablePing": true }
```

#### Update Configuration

**Endpoint:** `POST /config`

**Description:** Updates configuration settings.

**Request Body:**
```json
{
  "enablePing": true,
  "pingInterval": 5000
}
```

**Response:**
```json
{ "success": true }
```

### Alert Management

#### Get All Alerts

**Endpoint:** `GET /alerts`

**Description:** Retrieves all alerts.

**Query Parameters:**
- `startDate`: Start date for alert filtering (optional)
- `endDate`: End date for alert filtering (optional)

**Response:**
```json
[
  {
    "id": "alert-1234567890",
    "deviceId": "device-1234567890",
    "deviceLabel": "Router 1",
    "type": "status",
    "message": "Device is down",
    "status": "up",
    "timestamp": "2025-12-31T00:00:00.000Z",
    "level": "critical"
  }
]
```

#### Get Alerts by Device

**Endpoint:** `GET /alerts/:deviceId`

**Description:** Retrieves alerts for a specific device.

**Response:**
```json
[
  {
    "id": "alert-1234567890",
    "deviceId": "device-1234567890",
    "deviceLabel": "Router 1",
    "type": "status",
    "message": "Device is down",
    "status": "up",
    "timestamp": "2025-12-31T00:00:00.000Z",
    "level": "critical"
  }
]
```

#### Save Alert

**Endpoint:** `POST /alerts`

**Description:** Creates a new alert.

**Request Body:**
```json
{
  "deviceId": "device-1234567890",
  "deviceLabel": "Router 1",
  "type": "status",
  "message": "Device is down",
  "status": "up",
  "level": "critical"
}
```

**Response:**
```json
{ "success": true }
```

### Alert Settings Management

#### Get All Device Alert Settings

**Endpoint:** `GET /alerts/settings`

**Description:** Retrieves alert settings for all devices.

**Response:**
```json
{
  "device-1234567890": {
    "enabled": true
  },
  "device-0987654321": {
    "enabled": false
  }
}
```

#### Get Device Alert Settings

**Endpoint:** `GET /alerts/settings/:deviceId`

**Description:** Retrieves alert settings for a specific device.

**Response:**
```json
{ "enabled": true }
```

#### Update Device Alert Settings

**Endpoint:** `POST /alerts/settings/:deviceId`

**Description:** Updates alert settings for a specific device.

**Request Body:**
```json
{ "enabled": true }
```

**Response:**
```json
{ "success": true }
```

### Health Check

#### Health Check

**Endpoint:** `GET /health`

**Description:** Checks the health status of the API server.

**Response:**
```json
{ "status": "ok", "message": "WebSocket server is running" }
```

## WebSocket API

The Network Monitor also provides a WebSocket API for real-time updates.

### Connection URL

```
ws://localhost:3001
```

### Events

#### deviceUpdate

**Description:** Sent when device status or properties change.

**Payload:**
```json
[
  {
    "id": "device-1234567890",
    "type": "router",
    "label": "Router 1",
    "status": "up",
    "ip": "192.168.1.1",
    "pingTime": 10
  }
]
```

## Error Handling

All API endpoints return appropriate HTTP status codes and error messages.

### Common Status Codes

- `200 OK`: Request successful
- `400 Bad Request`: Invalid request parameters
- `500 Internal Server Error`: Server error

### Error Response Format

```json
{ "success": false, "error": "Error message" }
```

## Examples

### Get All Devices

```bash
curl http://localhost:3001/api/devices
```

### Create a Device

```bash
curl -X POST -H "Content-Type: application/json" -d '{"id": "device-test", "type": "router", "label": "Test Router", "x": 100, "y": 200, "ports": [{"id": "port-test", "name": "Port 1", "type": "optical", "rate": 1000, "mac": "00:00:00:00:00:00", "status": "up", "trafficIn": 0, "trafficOut": 0}], "status": "up", "ip": "192.168.1.100", "mac": "00:00:00:00:00:00"}' http://localhost:3001/api/devices
```

## Change Log

### Version 1.0.0

- Initial release
- Basic device and connection management
- Real-time WebSocket updates
- Alert system
- Configuration management

## Support

For issues or questions, please contact the development team.