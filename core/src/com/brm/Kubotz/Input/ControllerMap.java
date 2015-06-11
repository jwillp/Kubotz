package com.brm.Kubotz.Input;

/**
 * A generic Game Controller Map with classic Buttons
 * ABXY, R1,R2, L1,L2, SELECT, START, ANALOGS + D_PAD
 * This class is used as a mean to standardize other Controllers
 * Every map should implement this ControllerMap
 */
public interface ControllerMap {

    public int getButtonX();
    public int getButtonY();

    public int getButtonA();
    public int getButtonB();


    public int getButtonR1();
    public int getButtonR2();
    public int getButtonL1();
    public int getButtonL2();


    public int getButtonStart();
    public int getButtonSelect();

    public int getAxisLeftX();
    public int getAxisLeftY();




}
