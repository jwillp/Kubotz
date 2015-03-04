package com.brm.GoatEngine.ECS.Components;

import com.brm.GoatEngine.Utils.Timer;

/**
 * Used for a characters health
 */
public class HealthComponent extends Component {

    public final static String ID = "HEALTH_PROPERTY";

    protected float amount = 0;
    public float maxAmount = 100; //the maximum amount
    public float minAmount = 0;  // the minimum amount

    //Regeneration
    public Timer regenTimer = new Timer(0); //The number of milliseconds to regain health
    public float regenRate = 0; //the nbOf Points it regains every time de regenTimer delay is done


    public HealthComponent(){}

    public HealthComponent(float amount){
        this.amount = amount;
    }

    public HealthComponent(float amount, float min, float max){
        this.maxAmount = min;
        this.minAmount = max;
        this.setAmount(amount);
    }


    /**
     * Returns the current amount
     * @return
     */
    public float getAmount(){
        return this.amount;
    }

    /**
     * Sets the amount regardless of min and max
     * @param newAmount
     */
    public void setAmount(float newAmount){
        this.amount = newAmount;
    }

    /**
     * Adds a certain amount to the current amount making sure
     * it will not be higher than the max
     * @param amountToAdd
     */
    public void addAmount(float amountToAdd){
        this.amount = Math.min(this.amount + amountToAdd, maxAmount);
    }

    /**
     * Adds a certain amount to the current amount making sure
     * it will not be lower than the min
     * @param amountToSub
     */
    public void substractAmount(float amountToSub){
        this.amount = Math.max(this.amount - amountToSub, minAmount);
    }

    /**
     * Whether or not the current amount == the minimum
     * @return
     */
    public boolean isDead(){
        return this.amount == minAmount;
    }




}
