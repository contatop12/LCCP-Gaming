/** Dados oficiais da empresa. Toda página, metadado e JSON-LD lê daqui para manter o NAP idêntico. */
export const business = {
  name: 'LCPC Gaming',
  slogan: 'Seu PC, nosso conhecimento',
  owner: {
    name: 'Luis Carlos',
    role: 'Proprietário e responsável pelos serviços',
  },
  address: {
    street: 'Rua Maria Pais de Barros, 329',
    neighborhood: 'Vila Marari',
    city: 'São Paulo',
    state: 'SP',
    postalCode: '04402-140',
    country: 'BR',
  },
  phone: {
    display: '(11) 94470-0732',
    e164: '+5511944700732',
    whatsappNumber: '5511944700732',
  },
  email: 'contato@lcpcgaming.com',
} as const;

const { address } = business;

/** Formato único do endereço, usado em todo o site. */
export const fullAddress = `${address.street}, ${address.neighborhood}, ${address.city} - ${address.state}, CEP ${address.postalCode}`;

const destination = `${address.street}, ${address.neighborhood}, ${address.city} - ${address.state}, ${address.postalCode}`;

export const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
