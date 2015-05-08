package com.brm.GoatEngine.Utils.GameMath;

/**
 * General useful mathematical functions
 */
public class GameMath {


    /**
     * Returns whether a values is more or less a given number around another value
     * @param value
     * @param moreOrLess
     * @return
     */
    public static boolean isMoreOrLess(float value, float goalValue, float moreOrLess){
        return ((goalValue - moreOrLess) <= value) && (value <= (goalValue + moreOrLess));
    }


}
