package com.brm.GoatEngine.Utils.GameMath;

/**
 * General useful mathematic functions
 */
public class GameMath {

    /**
     * Returns whether a values is more or less a given number around another value
     * @param value
     * @param moreOrLess
     * @return
     */
    public static boolean isAround(int value, int goalValue, int moreOrLess){
        return value <= goalValue + moreOrLess || value >= goalValue - moreOrLess;
    }

    /**
     * Returns whether a values is more or less a given number around another value
     * @param value
     * @param moreOrLess
     * @return
     */
    public static boolean isAround(float value, float goalValue, float moreOrLess){
        return value <= goalValue + moreOrLess || value >= goalValue - moreOrLess;
    }


}
