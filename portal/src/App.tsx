import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, Row, Col, Form, Button, Card, Alert, Tabs, Tab } from 'react-bootstrap';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface RateLimitConfig {
  fixedWindow: {
    windowMs: number;
    max: number;
    message: string;
  };
  slidingWindow: {
    points: number;
    duration: number;
    blockDuration: number;
  };
  tokenBucket: {
    points: number;
    duration: number;
    refillRate: number;
    refillInterval: number;
  };
}

interface SimulationResult {
  requestNumber: number;
  timestamp: string;
  success: boolean;
  status: number;
  message: string;
  remaining?: number;
  msBeforeNext?: number;
}

interface SimulationResponse {
  algorithm: string;
  totalRequests: number;
  delay: number;
  results: SimulationResult[];
}

const API_URL = 'http://localhost:5001/api';

function App() {
  const [activeAlgorithm, setActiveAlgorithm] = useState<string>('fixedWindow');
  const [config, setConfig] = useState<RateLimitConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [simulationParams, setSimulationParams] = useState({
    requests: 20,
    delay: 500, // ms
  });
  const [simulationResults, setSimulationResults] = useState<SimulationResponse | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Fetch current configuration on component mount
  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/config`);
      setConfig(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch configuration');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async () => {
    if (!config) return;

    try {
      setLoading(true);
      await axios.post(`${API_URL}/config`, {
        algorithm: activeAlgorithm,
        config: config[activeAlgorithm as keyof RateLimitConfig],
      });
      setError(null);
      // Refresh config to get updated values
      await fetchConfig();
    } catch (err) {
      setError('Failed to update configuration');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!config) return;

    const { name, value } = e.target;
    const numValue = parseInt(value, 10);

    setConfig({
      ...config,
      [activeAlgorithm]: {
        ...config[activeAlgorithm as keyof RateLimitConfig],
        [name]: numValue,
      },
    });
  };

  const runSimulation = async () => {
    try {
      setIsSimulating(true);
      setError(null);
      const response = await axios.post(`${API_URL}/simulate`, {
        algorithm: activeAlgorithm,
        requests: simulationParams.requests,
        delay: simulationParams.delay,
      });
      setSimulationResults(response.data);
    } catch (err) {
      setError('Simulation failed');
      console.error(err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleSimulationParamChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSimulationParams({
      ...simulationParams,
      [name]: parseInt(value, 10),
    });
  };

  const renderConfigForm = () => {
    if (!config) return <div>Loading configuration...</div>;

    switch (activeAlgorithm) {
      case 'fixedWindow':
        return (
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Window Size (ms)</Form.Label>
              <Form.Control
                type="number"
                name="windowMs"
                value={config.fixedWindow.windowMs}
                onChange={handleConfigChange}
                min="1000"
                step="1000"
              />
              <Form.Text className="text-muted">
                Time window in milliseconds (e.g., 60000 for 1 minute)
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Max Requests</Form.Label>
              <Form.Control
                type="number"
                name="max"
                value={config.fixedWindow.max}
                onChange={handleConfigChange}
                min="1"
              />
              <Form.Text className="text-muted">
                Maximum number of requests allowed in the window
              </Form.Text>
            </Form.Group>
          </Form>
        );

      case 'slidingWindow':
        return (
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Points (Max Requests)</Form.Label>
              <Form.Control
                type="number"
                name="points"
                value={config.slidingWindow.points}
                onChange={handleConfigChange}
                min="1"
              />
              <Form.Text className="text-muted">
                Maximum number of requests allowed in the window
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Duration (seconds)</Form.Label>
              <Form.Control
                type="number"
                name="duration"
                value={config.slidingWindow.duration}
                onChange={handleConfigChange}
                min="1"
              />
              <Form.Text className="text-muted">
                Time window in seconds (e.g., 60 for 1 minute)
              </Form.Text>
            </Form.Group>
          </Form>
        );

      case 'tokenBucket':
        return (
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Bucket Size (Tokens)</Form.Label>
              <Form.Control
                type="number"
                name="points"
                value={config.tokenBucket.points}
                onChange={handleConfigChange}
                min="1"
              />
              <Form.Text className="text-muted">
                Maximum number of tokens in the bucket
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Duration (seconds)</Form.Label>
              <Form.Control
                type="number"
                name="duration"
                value={config.tokenBucket.duration}
                onChange={handleConfigChange}
                min="1"
              />
              <Form.Text className="text-muted">
                Time window in seconds (e.g., 60 for 1 minute)
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Refill Rate (tokens)</Form.Label>
              <Form.Control
                type="number"
                name="refillRate"
                value={config.tokenBucket.refillRate}
                onChange={handleConfigChange}
                min="1"
              />
              <Form.Text className="text-muted">
                Number of tokens added per interval
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Refill Interval (seconds)</Form.Label>
              <Form.Control
                type="number"
                name="refillInterval"
                value={config.tokenBucket.refillInterval}
                onChange={handleConfigChange}
                min="1"
              />
              <Form.Text className="text-muted">
                How often tokens are added to the bucket (in seconds)
              </Form.Text>
            </Form.Group>
          </Form>
        );

      default:
        return <div>Select an algorithm</div>;
    }
  };

  const renderSimulationChart = () => {
    if (!simulationResults) return null;

    const labels = simulationResults.results.map((r) => r.requestNumber.toString());
    const successData = simulationResults.results.map((r) => (r.success ? 1 : 0));
    const remainingData = simulationResults.results.map((r) => r.remaining || 0);

    const data = {
      labels,
      datasets: [
        {
          label: 'Request Success (1=Success, 0=Failed)',
          data: successData,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          yAxisID: 'y',
        },
        {
          label: 'Remaining Quota',
          data: remainingData,
          borderColor: 'rgb(53, 162, 235)',
          backgroundColor: 'rgba(53, 162, 235, 0.5)',
          yAxisID: 'y1',
        },
      ],
    };

    const options = {
      responsive: true,
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
      stacked: false,
      scales: {
        y: {
          type: 'linear' as const,
          display: true,
          position: 'left' as const,
          min: 0,
          max: 1,
          ticks: {
            stepSize: 1,
          },
        },
        y1: {
          type: 'linear' as const,
          display: true,
          position: 'right' as const,
          grid: {
            drawOnChartArea: false,
          },
          min: 0,
        },
      },
    };

    return <Line options={options} data={data} />
  };

  const renderSimulationResults = () => {
    if (!simulationResults) return null;

    const successCount = simulationResults.results.filter((r) => r.success).length;
    const failCount = simulationResults.results.length - successCount;

    return (
      <div className="mt-4">
        <h4>Simulation Results</h4>
        <p>
          Algorithm: <strong>{simulationResults.algorithm}</strong>, Total Requests:{' '}
          <strong>{simulationResults.totalRequests}</strong>, Delay:{' '}
          <strong>{simulationResults.delay}ms</strong>
        </p>
        <p>
          Success Rate:{' '}
          <strong>
            {((successCount / simulationResults.results.length) * 100).toFixed(2)}%
          </strong>{' '}
          ({successCount} succeeded, {failCount} failed)
        </p>

        {renderSimulationChart()}

        <div className="mt-4" style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <h5>Request Details</h5>
          {simulationResults.results.map((result, index) => (
            <Card 
              key={index} 
              className="mb-2" 
              border={result.success ? 'success' : 'danger'}
            >
              <Card.Body>
                <Card.Title>Request #{result.requestNumber}</Card.Title>
                <Card.Text>
                  Status: {result.status} ({result.message})<br />
                  Time: {new Date(result.timestamp).toLocaleTimeString()}<br />
                  {result.remaining !== undefined && (
                    <>Remaining: {result.remaining}<br /></>
                  )}
                  {result.msBeforeNext !== undefined && (
                    <>Reset in: {(result.msBeforeNext / 1000).toFixed(2)}s<br /></>
                  )}
                </Card.Text>
              </Card.Body>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Container className="py-4">
      <h1 className="mb-4">Rate Limiting Sandbox</h1>
      
      {error && <Alert variant="danger">{error}</Alert>}

      <Row>
        <Col md={6}>
          <Card className="mb-4">
            <Card.Header>
              <h3>Rate Limiting Configuration</h3>
            </Card.Header>
            <Card.Body>
              <Tabs
                activeKey={activeAlgorithm}
                onSelect={(k) => k && setActiveAlgorithm(k)}
                className="mb-3"
              >
                <Tab eventKey="fixedWindow" title="Fixed Window">
                  <p>
                    Fixed window counts requests in discrete time windows. Once the limit is reached,
                    all further requests are blocked until the next window begins.
                  </p>
                </Tab>
                <Tab eventKey="slidingWindow" title="Sliding Window">
                  <p>
                    Sliding window tracks requests over a continuously moving time window,
                    providing smoother rate limiting than fixed windows.
                  </p>
                </Tab>
                <Tab eventKey="tokenBucket" title="Token Bucket">
                  <p>
                    Token bucket allows for bursts of traffic by adding tokens to a bucket at a
                    fixed rate. Each request consumes one token, and requests are rejected when
                    the bucket is empty.
                  </p>
                </Tab>
              </Tabs>
              {renderConfigForm()}

              <Button
                variant="primary"
                onClick={updateConfig}
                disabled={loading}
                className="mt-3"
              >
                {loading ? 'Updating...' : 'Update Configuration'}
              </Button>
            </Card.Body>
          </Card>

          <Card>
            <Card.Header>
              <h3>Simulation</h3>
            </Card.Header>
            <Card.Body>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Number of Requests</Form.Label>
                  <Form.Control
                    type="number"
                    name="requests"
                    value={simulationParams.requests}
                    onChange={handleSimulationParamChange}
                    min="1"
                    max="100"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Delay Between Requests (ms)</Form.Label>
                  <Form.Control
                    type="number"
                    name="delay"
                    value={simulationParams.delay}
                    onChange={handleSimulationParamChange}
                    min="0"
                    max="5000"
                    step="100"
                  />
                  <Form.Text className="text-muted">
                    Set to 0 for no delay (burst of requests)
                  </Form.Text>
                </Form.Group>

                <Button
                  variant="success"
                  onClick={runSimulation}
                  disabled={isSimulating || !config}
                >
                  {isSimulating ? 'Simulating...' : 'Run Simulation'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          {renderSimulationResults()}
        </Col>
      </Row>
    </Container>
  );
}

export default App;
