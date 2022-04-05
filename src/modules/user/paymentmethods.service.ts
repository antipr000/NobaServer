import {
    Inject,
    Injectable,
  } from "@nestjs/common";
import { DBProvider } from "../../infraproviders/DBProvider";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { UserMapper } from "./mappers/UserMapper";
import {  PaymentMethodDTO } from "./dto/PaymentMethodDTO";

import Stripe from 'stripe';
import { convertStripePaymentMethodToPaymentMethodDTO } from "./mappers/PaymentMethodMappers";
import { AddPaymentMethodDTO } from "./dto/AddPaymentMethodDTO";
import { StripeService } from "../common/stripe.service";
import { IUserRepo } from "./repos/UserRepo";
import { MongoDBUserRepo } from "./repos/MongoDBUserRepo";
  
  
  
  @Injectable()
  export class PaymentMethodsService {
    
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger;
  
    private readonly userRepo : IUserRepo;
    private readonly userMapper: UserMapper;

    private readonly stripeApi: Stripe;
  
    constructor(dbProvider: DBProvider, stripeService: StripeService) {
        
        this.stripeApi = stripeService.stripeApi;
        
        this.userRepo = new MongoDBUserRepo(dbProvider);
        this.userMapper = new UserMapper();
    }


    async getPaymentMethods(userID: string): Promise<PaymentMethodDTO[]> { 

        const user = await this.userRepo.getUser(userID);
        const stripeCustomerID = user.props.stripeCustomerID;

        //TODO expand for other payment methods when needed
        const stripePaymentMethods = await this.stripeApi.paymentMethods.list({
            customer: stripeCustomerID,
            type: 'card',
          });
        
        console.log(stripePaymentMethods);
        return  (stripePaymentMethods.data??[]).map(stripePaymentMethod =>  convertStripePaymentMethodToPaymentMethodDTO(stripePaymentMethod));
    }
  
    async addPaymentMethod(userID: string, paymentMethod: AddPaymentMethodDTO): Promise<PaymentMethodDTO> {
        const user = await this.userRepo.getUser(userID);
        const stripeCustomerID = user.props.stripeCustomerID;

        //TODO expand for other payment methods when needed
        const params: Stripe.PaymentMethodCreateParams = {
            type: 'card',
            card: {
                number: paymentMethod.cardNumber,
                exp_month: paymentMethod.cardExpiryMonth,
                exp_year: paymentMethod.cardExpiryYear,
                cvc: paymentMethod.cardCVC,
            },
        };
        
        //first create payment method and then attach it to customer
        const stripePaymentMethod = await this.stripeApi.paymentMethods.create(params);
        //attach the payment method to the customer
        await this.stripeApi.paymentMethods.attach(stripePaymentMethod.id, {customer: stripeCustomerID});

        return convertStripePaymentMethodToPaymentMethodDTO(stripePaymentMethod);
    }

    async removePaymentMethod(userID: string, paymentMethodID: string): Promise<void> { 
        
        //weird that attach api takes the payment method id and customer id but detach api does not!
        await this.stripeApi.paymentMethods.detach(paymentMethodID);
    }
    
  }
  