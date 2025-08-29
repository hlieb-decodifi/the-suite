'use client';

import {
  generateSampleParams,
  getEmailTemplates,
  sendTestEmail,
  syncBrevoTemplateParams,
  testBrevoConnection,
  type EmailTemplate,
  type SendTestEmailParams,
  type SendTestEmailResult
} from '@/api/email/test-actions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, Loader2, Mail, RefreshCw, Send, XCircle, Code } from 'lucide-react';
import { useEffect, useState } from 'react';

type TestResult = {
  template: string;
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: Date;
}

// Utility function to generate TypeScript types from dynamic parameters
function generateTypeScriptInterface(templateName: string, dynamicParams: string[]): string {
  const interfaceName = `${templateName.replace(/[^a-zA-Z0-9]/g, '')}Params`;
  
  // Group parameters by object structure
  const simpleParams: string[] = [];
  const objectParams: Record<string, string[]> = {};
  
  dynamicParams.forEach(param => {
    if (param.includes('.')) {
      const parts = param.split('.');
      const objectName = parts[0];
      const propertyName = parts[1];
      if (objectName && propertyName) {
        if (!objectParams[objectName]) {
          objectParams[objectName] = [];
        }
        objectParams[objectName].push(propertyName);
      }
    } else {
      simpleParams.push(param);
    }
  });
  
  // Remove simple params that are also object arrays
  // If we have both "services" and "services.name", only keep the array structure
  const objectNames = Object.keys(objectParams);
  const filteredSimpleParams = simpleParams.filter(param => !objectNames.includes(param));
  
  // Determine types based on parameter names
  function getParameterType(paramName: string): string {
    const lowerParam = paramName.toLowerCase();
    
    // Number patterns
    if (lowerParam.includes('price') || lowerParam.includes('amount') || 
        lowerParam.includes('total') || lowerParam.includes('fee') ||
        lowerParam.includes('subtotal') || lowerParam.includes('tip') ||
        lowerParam.includes('duration')) {
      return 'number';
    }
    
    // Boolean patterns
    if (lowerParam.includes('is_') || lowerParam.includes('has_') ||
        lowerParam.includes('enabled') || lowerParam.includes('active')) {
      return 'boolean';
    }
    
    // Optional patterns (mostly URLs, IDs that might not be required)
    if (lowerParam.includes('url') || lowerParam.includes('phone') ||
        lowerParam.includes('tip') || lowerParam.includes('balance') ||
        lowerParam.includes('deposit')) {
      return 'string';
    }
    
    // Default to string
    return 'string';
  }
  
  // Generate interface content
  let interfaceContent = `export type ${interfaceName} = {\n`;
  
  // Add simple parameters (all required)
  filteredSimpleParams.sort().forEach(param => {
    const type = getParameterType(param);
    interfaceContent += `  ${param}: ${type};\n`;
  });
  
  // Add object parameters (arrays) - inline the object structure
  Object.entries(objectParams).forEach(([objectName, properties]) => {
    interfaceContent += `  ${objectName}: {\n`;
    properties.sort().forEach(prop => {
      const type = getParameterType(prop);
      interfaceContent += `    ${prop}: ${type};\n`;
    });
    interfaceContent += `  }[];\n`;
  });
  
  interfaceContent += `}`;
  
  return interfaceContent;
}

// Utility to generate multiple type interfaces
function generateAllTypesForTemplate(selectedTemplate: EmailTemplate): string {
  if (!selectedTemplate) return '';
  
  const templateTag = selectedTemplate.tag;
  const dynamicParams = selectedTemplate.dynamic_params;
  
  let result = `// Generated TypeScript types for ${selectedTemplate.name}\n`;
  result += `// Template Tag: ${templateTag}\n`;
  result += `// Brevo ID: ${selectedTemplate.brevo_template_id}\n\n`;
  
  // Generate the main interface
  result += generateTypeScriptInterface(templateTag, dynamicParams);
  
  // Add usage example
  result += `\n\n// Usage example:\n`;
  result += `// import { ${templateTag.replace(/[^a-zA-Z0-9]/g, '')}Params } from '@/providers/brevo/types';\n`;
  result += `// \n`;
  result += `// const params: ${templateTag.replace(/[^a-zA-Z0-9]/g, '')}Params = {\n`;
  
  // Generate sample usage
  const simpleParamsForUsage = dynamicParams.filter(p => !p.includes('.'));
  const objectParamsMap: Record<string, string[]> = {};
  
  // Group object parameters
  dynamicParams.forEach(param => {
    if (param.includes('.')) {
      const parts = param.split('.');
      const objectName = parts[0];
      const propertyName = parts[1];
      if (objectName && propertyName) {
        if (!objectParamsMap[objectName]) {
          objectParamsMap[objectName] = [];
        }
        objectParamsMap[objectName].push(propertyName);
      }
    }
  });
  
  // Filter out params that are also object arrays
  const objectNamesForUsage = Object.keys(objectParamsMap);
  const filteredSimpleParamsForUsage = simpleParamsForUsage.filter(param => !objectNamesForUsage.includes(param));
  
  filteredSimpleParamsForUsage.slice(0, 3).forEach(param => {
    const type = param.toLowerCase().includes('price') || param.toLowerCase().includes('amount') 
      ? '0' : "'sample_value'";
    result += `//   ${param}: ${type},\n`;
  });
  
  Object.entries(objectParamsMap).forEach(([objName, properties]) => {
    result += `//   ${objName}: [{\n`;
    properties.forEach(prop => {
      const sampleValue = prop.toLowerCase().includes('price') || prop.toLowerCase().includes('amount') || prop.toLowerCase().includes('duration')
        ? '100' : "'sample_value'";
      result += `//     ${prop}: ${sampleValue},\n`;
    });
    result += `//   }],\n`;
  });
  
  result += `// };\n`;
  
  return result;
}



export default function EmailTestPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [recipientEmail, setRecipientEmail] = useState('test@example.com');
  const [customParams, setCustomParams] = useState<Record<string, unknown>>({});
  const [showRawParams] = useState(false);
  const [rawParamsJson, setRawParamsJson] = useState('');
  const [sending, setSending] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{ success: boolean; message: string; templateCount?: number } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string; updated?: number } | null>(null);
  const [generatedTypes, setGeneratedTypes] = useState<string>('');
  const [showTypes, setShowTypes] = useState(false);

  // Load templates on component mount
  useEffect(() => {
    loadTemplates();
  }, []);

  // Update custom params when template is selected
  useEffect(() => {
    if (selectedTemplate) {
      generateSampleParams(selectedTemplate.dynamic_params).then(sampleParams => {
        setCustomParams(sampleParams);
        setRawParamsJson(JSON.stringify(sampleParams, null, 2));
      });
    }
  }, [selectedTemplate]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const result = await getEmailTemplates();
      if ('templates' in result) {
        setTemplates(result.templates);
        if (result.templates.length > 0 && result.templates[0]) {
          setSelectedTemplate(result.templates[0]);
        }
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendTest = async () => {
    if (!selectedTemplate) return;

    setSending(true);
    try {
      const params: SendTestEmailParams = {
        templateTag: selectedTemplate.tag,
        recipientEmail,
        params: showRawParams ? JSON.parse(rawParamsJson) : customParams
      };

      const result: SendTestEmailResult = await sendTestEmail(params);
      
      const testResult: TestResult = {
        template: selectedTemplate.name,
        success: result.success,
        ...(result.messageId && { messageId: result.messageId }),
        ...(result.error && { error: result.error }),
        timestamp: new Date()
      };

      setTestResults(prev => [testResult, ...prev.slice(0, 9)]); // Keep last 10 results
      
    } catch (error) {
      const testResult: TestResult = {
        template: selectedTemplate.name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
      setTestResults(prev => [testResult, ...prev.slice(0, 9)]);
    } finally {
      setSending(false);
    }
  };

  const handleParamChange = (key: string, value: string) => {
    setCustomParams(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const regenerateSampleData = async () => {
    if (selectedTemplate) {
      const sampleParams = await generateSampleParams(selectedTemplate.dynamic_params);
      setCustomParams(sampleParams);
      setRawParamsJson(JSON.stringify(sampleParams, null, 2));
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const result = await testBrevoConnection();
      setConnectionResult(result);
    } catch (error) {
      setConnectionResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSyncParams = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await syncBrevoTemplateParams();
      setSyncResult(result);
      
      // Reload templates if sync was successful and templates were updated
      if (result.success && result.updated && result.updated > 0) {
        await loadTemplates();
      }
    } catch (error) {
      setSyncResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleGenerateTypes = () => {
    if (!selectedTemplate) return;
    
    const types = generateAllTypesForTemplate(selectedTemplate);
    setGeneratedTypes(types);
    setShowTypes(true);
  };

  const copyTypesToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedTypes);
      alert('Types copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy: ', err);
      // Fallback: select text
      const textArea = document.createElement('textarea');
      textArea.value = generatedTypes;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Types copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading email templates...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Template Tester</h1>
          <p className="text-muted-foreground">
            Test all email templates using the production email functions with typed parameters
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleTestConnection} variant="outline" size="sm" disabled={testingConnection}>
            {testingConnection ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Test Brevo Connection
          </Button>
          <Button onClick={handleSyncParams} variant="outline" size="sm" disabled={syncing}>
            {syncing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Sync Parameters
          </Button>
          <Button onClick={handleGenerateTypes} variant="outline" size="sm" disabled={!selectedTemplate}>
            <Code className="h-4 w-4 mr-2" />
            Generate Types
          </Button>
          <Button onClick={handleSendTest} variant="outline" size="sm" disabled={!selectedTemplate || sending}>
            {sending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Test Email
          </Button>
          <Button onClick={loadTemplates} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Templates
          </Button>
        </div>
      </div>

      {/* Brevo Connection Test Results */}
      {connectionResult && (
        <Alert className={connectionResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <div className="flex items-start gap-3">
            {connectionResult.success ? (
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="font-medium mb-1">
                {connectionResult.success ? 'Brevo Connection Successful' : 'Brevo Connection Failed'}
              </div>
              <AlertDescription>
                {connectionResult.message}
                {connectionResult.templateCount !== undefined && (
                  <span className="ml-2">
                    <Badge variant="secondary">{connectionResult.templateCount} templates available</Badge>
                  </span>
                )}
              </AlertDescription>
            </div>
          </div>
        </Alert>
      )}

      {/* Sync Results */}
      {syncResult && (
        <Alert className={syncResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <div className="flex items-start gap-3">
            {syncResult.success ? (
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="font-medium mb-1">
                {syncResult.success ? 'Parameter Sync Successful' : 'Parameter Sync Failed'}
              </div>
              <AlertDescription>
                {syncResult.message}
                {syncResult.updated !== undefined && syncResult.updated > 0 && (
                  <span className="ml-2">
                    <Badge variant="secondary">{syncResult.updated} templates updated</Badge>
                  </span>
                )}
              </AlertDescription>
            </div>
          </div>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Templates ({templates.length})
            </CardTitle>
            <CardDescription>
              Select a template to test
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {templates.map((template) => (
              <div
                key={template.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedTemplate?.id === template.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setSelectedTemplate(template)}
              >
                <div className="font-medium text-sm">{template.name}</div>
                <div className="text-xs text-muted-foreground">
                  Tag: {template.tag}
                </div>
                <div className="text-xs text-muted-foreground">
                  Brevo ID: {template.brevo_template_id}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {template.dynamic_params.slice(0, 3).map((param, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {param}
                    </Badge>
                  ))}
                  {template.dynamic_params.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{template.dynamic_params.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Template Configuration */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {selectedTemplate ? selectedTemplate.name : 'No Template Selected'}
                </CardTitle>
                <CardDescription>
                  {selectedTemplate?.description || 'Select a template to configure and test'}
                </CardDescription>
              </div>
              {selectedTemplate && (
                <Badge variant="outline">
                  {selectedTemplate.dynamic_params.length} parameters
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedTemplate ? (
              <Tabs defaultValue="simple" className="w-full">
                <div className="flex items-center justify-between mb-4">
                  <TabsList>
                    <TabsTrigger value="simple">Simple Form</TabsTrigger>
                    <TabsTrigger value="json">JSON Editor</TabsTrigger>
                  </TabsList>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={regenerateSampleData}
                      variant="outline"
                      size="sm"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Regenerate Sample Data
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="recipient">Recipient Email</Label>
                    <Input
                      id="recipient"
                      type="email"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="test@example.com"
                    />
                  </div>

                  <TabsContent value="simple" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                      {selectedTemplate.dynamic_params.map((param) => (
                        <div key={param}>
                          <Label htmlFor={param} className="text-sm">
                            {param.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Label>
                          {param.includes('url') || param === 'message' || param === 'reason' ? (
                            <Textarea
                              id={param}
                              value={typeof customParams[param] === 'object' 
                                ? JSON.stringify(customParams[param]) 
                                : String(customParams[param] || '')
                              }
                              onChange={(e) => handleParamChange(param, e.target.value)}
                              className="min-h-[60px]"
                            />
                          ) : (
                            <Input
                              id={param}
                              value={typeof customParams[param] === 'object' 
                                ? JSON.stringify(customParams[param]) 
                                : String(customParams[param] || '')
                              }
                              onChange={(e) => handleParamChange(param, e.target.value)}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="json" className="space-y-4">
                    <div>
                      <Label htmlFor="json-params">Parameters JSON</Label>
                      <Textarea
                        id="json-params"
                        value={rawParamsJson}
                        onChange={(e) => setRawParamsJson(e.target.value)}
                        className="min-h-[300px] font-mono text-sm"
                        placeholder="Enter JSON parameters..."
                      />
                    </div>
                  </TabsContent>

                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      onClick={handleSendTest}
                      disabled={sending}
                      className="flex-1"
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Send Test Email
                    </Button>
                  </div>
                </div>
              </Tabs>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                Select a template from the left to start testing
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Generated TypeScript Types */}
      {showTypes && generatedTypes && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Generated TypeScript Types
                </CardTitle>
                <CardDescription>
                  Copy these types to your types.ts file
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button onClick={copyTypesToClipboard} variant="outline" size="sm">
                  Copy to Clipboard
                </Button>
                <Button onClick={() => setShowTypes(false)} variant="outline" size="sm">
                  Close
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm font-mono whitespace-pre-wrap">
                <code>{generatedTypes}</code>
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>
              Recent email sending attempts (showing last 10)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <Alert key={index} className={result.success ? 'border-green-200' : 'border-red-200'}>
                  <div className="flex items-start gap-3">
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{result.template}</span>
                        <span className="text-xs text-muted-foreground">
                          {result.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <AlertDescription>
                        {result.success ? (
                          <span>
                            Email sent successfully
                            {result.messageId && (
                              <span className="text-xs text-muted-foreground ml-2">
                                ID: {result.messageId}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-red-600">{result.error}</span>
                        )}
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Testing Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h4 className="font-medium text-sm mb-2">Parameter Synchronization</h4>
            <p className="text-sm text-muted-foreground">
              • Use "Sync Parameters" to automatically extract variables from Brevo templates
              • Updates the database with the actual parameters used in each template
              • Scans HTML content, subject lines, and text content for {`{{ variable }}`} patterns
              • Ensures database dynamic_params matches your Brevo templates exactly
            </p>
          </div>
          <div>
            <h4 className="font-medium text-sm mb-2">TypeScript Type Generation</h4>
            <p className="text-sm text-muted-foreground">
              • Use "Generate Types" to create TypeScript interfaces from dynamic parameters
              • Automatically detects object properties (like services.name, services.price) and creates nested types
              • Infers types (string, number, boolean) based on parameter names
              • Marks optional parameters (URLs, phone, tip amounts) with optional modifiers
              • Copy generated types directly to your types.ts file for perfect type safety
            </p>
          </div>
          <div>
            <h4 className="font-medium text-sm mb-2">Production Email Functions</h4>
            <p className="text-sm text-muted-foreground">
              • Now uses the actual typed email functions from the production codebase
              • Each template has its own typed function with proper parameter validation
              • Email method (local/Brevo) is controlled by EMAIL_METHOD environment variable
              • Set EMAIL_METHOD=local for Mailpit testing, or EMAIL_METHOD=api for Brevo
            </p>
          </div>
          <div>
            <h4 className="font-medium text-sm mb-2">Local Testing (Mailpit)</h4>
            <p className="text-sm text-muted-foreground">
              • Ensure Mailpit is running on localhost:1025
              • Start it with: <code className="bg-muted px-1 rounded">./scripts/start-mailpit.sh</code>
              • View emails at: <a href="http://localhost:8025" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">http://localhost:8025</a>
              • Uses real Brevo templates with local SMTP delivery
            </p>
          </div>
          <div>
            <h4 className="font-medium text-sm mb-2">Brevo API Testing</h4>
            <p className="text-sm text-muted-foreground">
              • Use "Test Brevo Connection" button to verify API key and template access
              • Ensure BREVO_API_KEY is set in your environment
              • Sends actual emails via Brevo's infrastructure
              • Make sure recipient email is valid for production testing
            </p>
          </div>
          <div>
            <h4 className="font-medium text-sm mb-2">Parameter Testing</h4>
            <p className="text-sm text-muted-foreground">
              • Use "Simple Form" for easy parameter editing
              • Use "JSON Editor" for complex objects and arrays
              • Click "Regenerate Sample Data" to reset to default values
              • Parameters are now type-checked against each template's requirements
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
