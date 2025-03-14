import { Configuration } from '@getopenpay/client';
import OpenPayClient from '@getopenpay/client/client';

// Create client
const config = new Configuration({
  basePath: 'https://connto.openpaystaging.com',
  // Publishable token here:
  apiKey: '',
  // Secret token here:
  accessToken: '',
})
const client = new OpenPayClient(config);

// List products
client.productsApi.listProducts({
  productQueryParams: {
    pageSize: 10,
  },
}).then(({ data: products }) => {
  console.log(products);
}).catch((error) => {
  console.error('Error:', error);
});

client.customersApi.createCustomer({
  createCustomerRequest: {
    email: 'test_customer+1@getopenpay.com',
    firstName: 'John',
    lastName: 'Smith',
    line1: '123 Main St',
    city: 'San Francisco',
    state: 'CA',
    country: 'US',
    zipCode: '94105'
  }
}).then((customer) => {
  console.log(customer);
}).catch((error) => {
  console.error('Error:', error);
});
