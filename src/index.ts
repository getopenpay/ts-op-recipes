import { Configuration } from '@getopenpay/client';
import OpenPayClient from '@getopenpay/client/client';
import { WebhookUtils, InvalidSignatureError } from './webhookUtils';

// Create client
const config = new Configuration({
  basePath: 'https://connto.openpaystaging.com',
  // Publishable token here:
  apiKey: '',
  // Secret token here:
  accessToken: '',
})
const client = new OpenPayClient(config);
const customerExtId = '';
const now = Date.now();

async function meteredSubscriptionCreationRecipe() {
  try {
    // List customers to find the one with the specified external ID
    const { data: customers } = await client.customersApi.listCustomers({
      customerQueryParams: {
        pageSize: 100
      }
    });

    // Find the customer with the matching external ID
    const customer = customers.find(c => c.id === customerExtId);

    if (!customer) {
      throw new Error(`Customer with external ID ${customerExtId} not found`);
    }

    console.log(`Found customer: ${customer.firstName} ${customer.lastName} (${customer.email})`);

    // Get customer payment methods
    const paymentMethodsResponse = await client.customersApi.listCustomerPaymentMethods({
      customerId: customer.id,
      customerPaymentMethodQueryParams: {}
    });

    // Check if the customer has any payment methods
    if (!paymentMethodsResponse.data || paymentMethodsResponse.data.length === 0) {
      throw new Error(`Customer ${customer.id} has no payment methods`);
    }

    // Use the first payment method
    const paymentMethod = paymentMethodsResponse.data[0];
    console.log(`Using payment method: ${paymentMethod.id}`);

    // Create a test product
    const product = await client.productsApi.createProduct({
      createProductRequest: {
        name: `Test Product ${now}`,
        description: 'Test Product for Metered Billing'
      }
    });

    // Create a test meter
    const meter = await client.billingMetersApi.createBillingMeter({
      createBillingMeterRequest: {
        displayName: `Test Meter ${now}`,
        eventName: `test_meter_event_${now}`,
        eventPayloadCustomerMappingKey: 'customer_id',
        eventPayloadValueKey: 'usage_value'
      }
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create a metered price
    const price = await client.pricesApi.createPriceForProduct({
      createPriceRequest: {
        productId: product.id,
        isExclusive: false,
        isActive: true,
        pricingModel: 'volume',
        transformQuantityDivideBy: 1,
        currency: 'usd',
        priceTiers: [{
          unitsFrom: 0,
          unitsUpto: null,
          unitAmountAtom: 100,
          flatAmountAtom: 0
        }],
        priceType: 'recurring',
        billingInterval: 'month',
        billingIntervalCount: 1,
        trialPeriodDays: 0,
        usageType: 'metered',
        isDefault: false,
        meterId: meter.id
      }
    });

    // Create a subscription
    const subscription = await client.subscriptionsApi.createSubscriptions({
      createSubscriptionRequest: {
        customerId: customer.id,
        paymentMethodId: paymentMethod.id,
        selectedProductPriceQuantity: [{
          priceId: price.id,
          quantity: 0
        }],
        totalAmountAtom: 0 // metered billing starts at 0
      }
    });

    // Create usage entry
    const usageQuantity = 2;
    await client.billingMeterEventsApi.createBillingMeterEvent({
      createBillingMeterEventRequest: {
        eventName: meter.eventName,
        payload: {
          customer_id: customer.id,
          usage_value: usageQuantity
        }
      }
    });

    // Wait for usage to be processed
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Preview next invoice
    const invoice = await client.invoicesApi.previewNextInvoice({
      subscriptionId: subscription.created[0].id
    });

    console.log('invoice amount:', invoice.dueAmountAtom);

  } catch (error) {
    console.error('Error:', error);
  }
}

async function verifyWebhookSignatureRecipe() {
  const secret_key = 'whsec_XXXXXXXXXXXXXXXX';
  const event_data = '{"id": "event_dev_abcdefg12345678", "object": "event", ...}';

  // Example request object. Use the real request reponse here for your application
  const request = {
    headers: {
      get: (header: string) => 't=1234567890,v1=abcdef1234567890'
    }
  };

  const signature_digest = request.headers.get('signature-digest');
  const webhookUtils = new WebhookUtils();

  try {
    webhookUtils.validatePayload(event_data, signature_digest, secret_key);
    console.log('Webhook signature is valid');
  } catch (error) {
    if (error instanceof InvalidSignatureError) {
      console.error('Invalid webhook signature');
    } else {
      console.error('Error verifying webhook:', error);
    }
  }
}

// Run the test
meteredSubscriptionCreationRecipe();
