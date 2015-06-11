package com.brm.Kubotz.Input;

/**
 * Diaron Simple Game Controller
 */
public class DiaronControllerMap implements ControllerMap {

    public static final String NAME = "USB Gamepad";

    public static final int BUTTON_1 = 0;
    public static final int BUTTON_2 = 1;
    public static final int BUTTON_3 = 2;
    public static final int BUTTON_4 = 3;


    public static final int BUTTON_R1 = 5;
    private static final int BUTTON_R2 = 7;



    public static final int BUTTON_START = 0;
    public static final int AXIS_LEFT_X = 1; //-1 is left | +1 is right
    public static final int AXIS_LEFT_Y = 0; //-1 is up | +1 is down


    @Override
    public String getID() {
        return NAME;
    }

    @Override
    public int getButtonX() {
        return BUTTON_4;
    }

    @Override
    public int getButtonY() {
        return BUTTON_1;
    }

    @Override
    public int getButtonA() {
        return BUTTON_3;
    }

    @Override
    public int getButtonB() {
        return BUTTON_2;
    }



    @Override
    public int getButtonR1() {
        return BUTTON_R1;
    }

    @Override
    public int getButtonR2() {
        return BUTTON_R2;
    }

    @Override
    public int getButtonL1() {
        return 0;
    }

    @Override
    public int getButtonL2() {
        return 0;
    }



    @Override
    public int getButtonStart() {
        return BUTTON_START;
    }

    @Override
    public int getButtonSelect() {
        return 0;
    }



    @Override
    public int getAxisLeftX() {
        return AXIS_LEFT_X;
    }

    @Override
    public int getAxisLeftY() {
        return AXIS_LEFT_Y;
    }






}
