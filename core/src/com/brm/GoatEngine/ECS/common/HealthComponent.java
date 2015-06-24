package com.brm.GoatEngine.ECS.common;

import com.badlogic.gdx.utils.XmlReader.Element;
import com.badlogic.gdx.utils.XmlWriter;
import com.brm.GoatEngine.ECS.core.EntityComponent;
import com.brm.GoatEngine.Files.XmlSerializable;
import com.brm.GoatEngine.Utils.Timer;

import javax.sql.rowset.spi.XmlReader;
import java.io.IOException;
import java.lang.reflect.Field;

/**
 * Used for a characters health
 */
public class HealthComponent extends EntityComponent{

    public final static String ID = "HEALTH_PROPERTY";

    protected float amount;
    protected float maxAmount; //the maximum amount
    protected float minAmount;  // the minimum amount

    //Regeneration
    protected Timer regenTimer = new Timer(0); //The number of milliseconds to regain health
    protected float regenRate = 0; //the nb Of Points it regains every time de regenTimer delay is done


    public HealthComponent(float amount){
        this.amount = amount;
        this.minAmount = 0;
        this.maxAmount = 100;
    }

    public HealthComponent(float amount, float min, float max){
        this.maxAmount = min;
        this.minAmount = max;
        this.setAmount(amount);
    }



    public HealthComponent(Element element){
        super(element);
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


    public float getMaxAmount() {
        return maxAmount;
    }

    public void setMaxAmount(float maxAmount) {
        this.maxAmount = maxAmount;
    }

    public float getMinAmount() {
        return minAmount;
    }

    public void setMinAmount(float minAmount) {
        this.minAmount = minAmount;
    }

    public Timer getRegenTimer() {
        return regenTimer;
    }

    public void setRegenTimer(Timer regenTimer) {
        this.regenTimer = regenTimer;
    }

    public float getRegenRate() {
        return regenRate;
    }

    public void setRegenRate(float regenRate) {
        this.regenRate = regenRate;
    }




    /**
     * Desiralizes a component
     *
     * @param componentData the data as an XML element
     */
    @Override
    public void deserialize(Element componentData) {
        for(Element param: componentData.getChildrenByName("param")){
            String name = param.getAttribute("name");
            String value = param.getText();
            if(name.equals("maxAmount")){
                this.setMaxAmount(Float.parseFloat(value));
            }else if(name.equals("minAmount")){
                this.setMinAmount(Float.parseFloat(value));
            }else if(name.equals("amount")){
                this.setAmount(Float.parseFloat(value));
            }
        }
    }




}
